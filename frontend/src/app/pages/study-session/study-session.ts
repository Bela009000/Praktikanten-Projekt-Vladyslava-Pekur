import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';

import { DataService, Topic, Card } from '../../services/data.service';

type ModeKey = 'lernmodus' | 'quiz' | 'memory' | 'mc';

interface MemoryTile {
  tileId: number;
  cardId: string;
  text: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const MODES: { key: ModeKey; label: string }[] = [
  { key: 'lernmodus', label: 'Lernmodus' },
  { key: 'quiz', label: 'Quiz' },
  { key: 'memory', label: 'Memory' },
  { key: 'mc', label: 'Multiple Choice' }
];

@Component({
  selector: 'app-study-session',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './study-session.html',
  styleUrl: './study-session.css'
})
export class StudySession implements OnInit, OnDestroy {
  topics: Topic[] = [];

  selectedTopicId: string | null = null;
  topicName = '';

  allCards: Card[] = [];

  isLoading = true;
  isLoadingCards = false;

  availableModes = MODES;
  selectedModes = new Set<ModeKey>();

  sessionStarted = false;
  sessionFinished = false;

  passedCount = 0;
  currentCardIndex = 0;
  currentCardModes: ModeKey[] = [];
  currentMode: ModeKey | null = null;

  phaseCards: Card[] = [];
  phaseCardIndex = 0;

  answerFirst = false;
  showLernAnswer = false;

  quizUserAnswer = '';
  quizShowResult = false;
  quizIsCorrect = false;

  mcOptions: string[] = [];
  mcSelected: string | null = null;
  mcAnswered = false;

  memoryTiles: MemoryTile[] = [];
  memoryFlipped: MemoryTile[] = [];
  memoryBusy = false;

  private topicCards: Card[] = [];
  private nextTileId = 0;
  private continueSession = false;
  private finishing = false;
  private destroyed = false;
  private memoryTimer?: ReturnType<typeof setTimeout>;

  private passedModesByCard = new Map<string, Set<ModeKey>>();
  private queue: { cardIndex: number; mode: ModeKey }[] = [];
  private queuePos = 0;

  constructor(
    private dataService: DataService,
    private changeDetectorRef: ChangeDetectorRef,
    private route: ActivatedRoute
  ) {}

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const topicId = params.get('topicId');

    this.continueSession = params.get('continue') === 'true';

    const modes = (params.get('modes') || '')
      .split(',')
      .filter((mode): mode is ModeKey =>
        MODES.some(item => item.key === mode)
      );

    if (modes.length > 0) {
      this.selectedModes = new Set(modes);
    }

    try {
      const allTopics = await this.dataService.getTopics();

      const counted = await Promise.all(
        allTopics.map(async topic => ({
          topic,
          count: (await this.dataService.getCards(topic.id)).length
        }))
      );

      this.topics = counted
        .filter(item => item.count >= 2)
        .map(item => item.topic);

      if (topicId && this.topics.some(topic => topic.id === topicId)) {
        this.selectedTopicId = topicId;

        await this.loadCards();
      }
    } catch (error) {
      console.error('STUDY SESSION LOAD TOPICS ERROR:', error);
    } finally {
      this.isLoading = false;
      this.update();
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    clearTimeout(this.memoryTimer);
  }

  private update(): void {
    if (!this.destroyed) {
      this.changeDetectorRef.detectChanges();
    }
  }

  async onTopicChange(): Promise<void> {
    this.selectedModes.clear();
    this.allCards = [];
    this.topicCards = [];
    this.topicName = '';
    this.continueSession = false;
    this.isLoadingCards = false;

    await this.loadCards();
  }

  private async loadCards(): Promise<void> {
    const topicId = this.selectedTopicId;

    if (topicId === null) {
      return;
    }

    this.isLoadingCards = true;
    this.update();

    try {
      const cards = await this.dataService.getCards(topicId);

      if (this.selectedTopicId !== topicId) {
        return;
      }

      this.topicCards = cards;

      this.allCards = this.continueSession
        ? cards.filter(card => !card.learned)
        : cards;

      this.topicName =
        this.topics.find(topic => topic.id === topicId)?.name || '';
    } catch (error) {
      console.error('STUDY SESSION LOAD CARDS ERROR:', error);

      if (this.selectedTopicId === topicId) {
        this.allCards = [];
      }
    } finally {
      if (this.selectedTopicId === topicId) {
        this.isLoadingCards = false;
      }

      this.update();
    }
  }

  toggleMode(key: ModeKey): void {
    if (!this.selectedModes.delete(key)) {
      this.selectedModes.add(key);
    }
  }

  get canStart(): boolean {
    return (
      this.selectedTopicId !== null &&
      this.selectedModes.size > 0 &&
      this.allCards.length > 0
    );
  }

  get currentPhase(): ModeKey | null {
    return this.currentMode;
  }

  get currentPhaseCard(): Card | undefined {
    return this.allCards[this.currentCardIndex];
  }

  get phaseLabel(): string {
    return MODES.find(item => item.key === this.currentMode)?.label || '';
  }

  get memoryBatchProgress(): string {
    return '1 / 1';
  }

  private answerOf(card: Card): string {
    return this.answerFirst ? card.question : card.answer;
  }

  private addMode(
    map: Map<string, Set<ModeKey>>,
    cardId: string,
    mode: ModeKey
  ): void {
    const modes = map.get(cardId) ?? new Set<ModeKey>();

    modes.add(mode);
    map.set(cardId, modes);
  }

  startSession(): void {
    if (!this.canStart) {
      return;
    }

    this.currentCardIndex = 0;
    this.passedCount = 0;
    this.sessionStarted = true;
    this.sessionFinished = false;
    this.showLernAnswer = false;

    this.passedModesByCard.clear();

    this.queue = this.spread(
      this.allCards.flatMap((_, cardIndex) =>
        Array.from(this.selectedModes).map(mode => ({ cardIndex, mode }))
      )
    );

    this.queuePos = 0;

    this.nextTask();
  }

  get totalSteps(): number {
    return this.queue.length;
  }

  get currentStep(): number {
    return Math.min(this.queuePos, this.queue.length);
  }

  private spread<T extends { cardIndex: number; mode: ModeKey }>(
    tasks: T[]
  ): T[] {
    const pool = this.shuffle(tasks);
    const result: T[] = [];

    while (pool.length > 0) {
      const last = result[result.length - 1];

      let index = pool.findIndex(
        task =>
          !last ||
          (task.cardIndex !== last.cardIndex && task.mode !== last.mode)
      );

      if (index === -1) {
        index = pool.findIndex(
          task => !last || task.cardIndex !== last.cardIndex
        );
      }

      result.push(...pool.splice(Math.max(index, 0), 1));
    }

    return result;
  }

  private nextTask(): void {
    const task = this.queue[this.queuePos++];

    if (!task) {
      void this.finishSession();
      return;
    }

    const card = this.allCards[task.cardIndex];

    this.currentCardIndex = task.cardIndex;
    this.currentCardModes = Array.from(this.selectedModes);
    this.currentMode = task.mode;
    this.phaseCards = [card];
    this.phaseCardIndex = 0;

    this.resetCurrentMode();

    if (task.mode === 'memory') {
      this.setupMemoryPhase();
    }

    if (task.mode === 'mc') {
      this.setupMcOptions();
    }

    this.update();
  }

  private finishMode(mode: ModeKey, passed: boolean): void {
    const card = this.currentPhaseCard;

    if (!card || this.currentMode !== mode) {
      return;
    }

    if (passed) {
      this.addMode(this.passedModesByCard, card.id, mode);
    }

    this.nextTask();
  }

  private resetCurrentMode(): void {
    this.showLernAnswer = false;

    this.quizUserAnswer = '';
    this.quizShowResult = false;
    this.quizIsCorrect = false;

    this.mcOptions = [];
    this.mcSelected = null;
    this.mcAnswered = false;

    this.memoryTiles = [];
    this.memoryFlipped = [];
    this.memoryBusy = false;
  }

  revealLernAnswer(): void {
    this.showLernAnswer = true;
    this.update();
  }

  toggleAnswerFirst(): void {
    this.answerFirst = !this.answerFirst;
    this.showLernAnswer = false;
    this.quizShowResult = false;
    this.quizIsCorrect = false;

    if (
      this.sessionStarted &&
      !this.sessionFinished &&
      this.currentMode === 'mc'
    ) {
      this.setupMcOptions();
      this.mcSelected = null;
      this.mcAnswered = false;
    }

    this.update();
  }

  markLern(pass: boolean): void {
    this.finishMode('lernmodus', pass);
  }

  checkQuizAnswer(): void {
    const card = this.currentPhaseCard;

    if (
      !card ||
      this.currentMode !== 'quiz' ||
      this.quizShowResult ||
      this.quizUserAnswer.trim() === ''
    ) {
      return;
    }

    this.quizIsCorrect =
      this.normalize(this.quizUserAnswer) ===
      this.normalize(this.answerOf(card));

    this.quizShowResult = true;
    this.update();
  }

  nextQuizCard(): void {
    if (this.quizShowResult) {
      this.finishMode('quiz', this.quizIsCorrect);
    }
  }

  selectMcOption(option: string): void {
    if (this.mcAnswered || !this.currentPhaseCard) {
      return;
    }

    this.mcSelected = option;
    this.mcAnswered = true;
    this.update();
  }

  nextMcCard(): void {
    const card = this.currentPhaseCard;

    if (!card || !this.mcAnswered) {
      return;
    }

    this.finishMode('mc', this.mcSelected === this.answerOf(card));
  }

  isCorrectMcOption(option: string): boolean {
    const card = this.currentPhaseCard;

    return !!card && option === this.answerOf(card);
  }

  private setupMcOptions(): void {
    const card = this.currentPhaseCard;

    if (!card) {
      return;
    }

    const correct = this.answerOf(card);
    const pool = this.topicCards.length > 0 ? this.topicCards : this.allCards;

    const wrong = this.shuffle(
      Array.from(
        new Set(
          pool
            .filter(item => item.id !== card.id)
            .map(item => this.answerOf(item))
            .filter(answer => answer && answer !== correct)
        )
      )
    ).slice(0, 3);

    this.mcOptions = this.shuffle([correct, ...wrong]);
  }

  private setupMemoryPhase(): void {
    const card = this.currentPhaseCard;

    if (!card) {
      return;
    }

    const tile = (text: string): MemoryTile => ({
      tileId: this.nextTileId++,
      cardId: card.id,
      text,
      isFlipped: false,
      isMatched: false
    });

    this.memoryTiles = this.shuffle([tile(card.question), tile(card.answer)]);
    this.memoryFlipped = [];
    this.memoryBusy = false;
  }

  selectMemoryTile(tile: MemoryTile): void {
    if (
      !this.currentPhaseCard ||
      this.memoryBusy ||
      tile.isFlipped ||
      tile.isMatched
    ) {
      return;
    }

    tile.isFlipped = true;
    this.memoryFlipped.push(tile);
    this.update();

    if (this.memoryFlipped.length !== 2) {
      return;
    }

    this.memoryBusy = true;

    const [first, second] = this.memoryFlipped;
    const isMatch = first.cardId === second.cardId;

    if (isMatch) {
      first.isMatched = true;
      second.isMatched = true;
      this.update();
    }

    this.memoryTimer = setTimeout(
      () => {
        if (this.destroyed) {
          return;
        }

        if (!isMatch) {
          first.isFlipped = false;
          second.isFlipped = false;
        }

        this.memoryFlipped = [];
        this.memoryBusy = false;

        this.finishMode('memory', isMatch);
        this.update();
      },
      isMatch ? 500 : 900
    );
  }

  private async finishSession(): Promise<void> {
    const topicId = this.selectedTopicId;

    if (topicId === null || this.finishing) {
      return;
    }

    this.finishing = true;

    const modes = Array.from(this.selectedModes);
    const passedIds: string[] = [];
    const failedIds: string[] = [];

    for (const card of this.allCards) {
      const passedModes = this.passedModesByCard.get(card.id);

      const passed =
        modes.length > 0 && modes.every(mode => passedModes?.has(mode));

      (passed ? passedIds : failedIds).push(card.id);
    }

    try {
      await this.dataService.setCardsLearned(topicId, passedIds, true);

      if (!this.continueSession) {
        await this.dataService.setCardsLearned(topicId, failedIds, false);
      }

      const topicCards = await this.dataService.getCards(topicId);

      this.topicCards = topicCards;
      this.allCards = topicCards;
      this.passedCount = topicCards.filter(card => card.learned).length;

      await this.dataService.saveStudySessionResult(
        topicId,
        this.topicName,
        this.passedCount,
        topicCards.length,
        modes
      );
    } catch (error) {
      console.error('STUDY SESSION SAVE ERROR:', error);
    }

    this.finishing = false;
    this.sessionFinished = true;
    this.currentMode = null;

    this.update();
  }

  async restart(): Promise<void> {
    clearTimeout(this.memoryTimer);

    this.sessionStarted = false;
    this.sessionFinished = false;

    this.currentCardIndex = 0;
    this.currentMode = null;
    this.currentCardModes = [];
    this.passedCount = 0;

    this.passedModesByCard.clear();
    this.queue = [];
    this.queuePos = 0;

    this.resetCurrentMode();
    this.update();

    await this.loadCards();
  }

  private normalize(answer: string): string {
    return answer.trim().toLowerCase().replace(/\s+/g, ' ');
  }

private shuffle(items: any[]): any[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}
}