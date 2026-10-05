import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';

import {
  DataService,
  Topic,
  Card
} from '../../services/data.service';

type ModeKey = 'lernmodus' | 'quiz' | 'memory' | 'mc';

interface MemoryTile {
  tileId: number;
  cardId: string;
  text: string;
  isFlipped: boolean;
  isMatched: boolean;
}

@Component({
  selector: 'app-study-session',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './study-session.html',
  styleUrl: './study-session.css'
})
export class StudySession {

  topics: Topic[] = [];

  selectedTopicId: string | null = null;
  topicName = '';

  allCards: Card[] = [];

  isLoading = true;
  isLoadingCards = false;

  availableModes: {
    key: ModeKey;
    label: string;
  }[] = [
    { key: 'lernmodus', label: 'Lernmodus' },
    { key: 'quiz', label: 'Quiz' },
    { key: 'memory', label: 'Memory' },
    { key: 'mc', label: 'Multiple Choice' }
  ];

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

  private nextTileId = 0;

  private passedModesByCard =
    new Map<string, Set<ModeKey>>();

  private triedModesByCard =
    new Map<string, Set<ModeKey>>();

  private continueSession = false;

  constructor(
    private dataService: DataService,
    private changeDetectorRef: ChangeDetectorRef,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    const topicId =
      this.route.snapshot.queryParamMap.get('topicId');

    const modesParam =
      this.route.snapshot.queryParamMap.get('modes');

    this.continueSession =
      this.route.snapshot.queryParamMap.get('continue') === 'true';

    if (modesParam) {
      const modes =
        modesParam
          .split(',')
          .filter(
            (mode): mode is ModeKey =>
              [
                'lernmodus',
                'quiz',
                'memory',
                'mc'
              ].includes(mode)
          );

      if (modes.length > 0) {
        this.selectedModes =
          new Set<ModeKey>(modes);
      }
    }

    try {
      const allTopics =
        await this.dataService.getTopics();

      const topicResults =
        await Promise.all(
          allTopics.map(
            async topic => {
              const cards =
                await this.dataService.getCards(
                  topic.id
                );

              return cards.length >= 2
                ? topic
                : null;
            }
          )
        );

      this.topics =
        topicResults.filter(
          (topic): topic is Topic =>
            topic !== null
        );

      if (topicId) {
        const topicExists =
          this.topics.some(
            topic =>
              topic.id === topicId
          );

        if (topicExists) {
          this.selectedTopicId = topicId;

          const topic =
            this.topics.find(
              topic =>
                topic.id === topicId
            );

          this.topicName =
            topic?.name || '';

          await this.loadCards();
        }
      }
    } catch (error) {
      console.error(
        'STUDY SESSION LOAD TOPICS ERROR:',
        error
      );
    } finally {
      this.isLoading = false;
      this.changeDetectorRef.detectChanges();
    }
  }

  async onTopicChange() {
    this.selectedModes.clear();
    this.allCards = [];
    this.topicName = '';
    this.continueSession = false;

    if (this.selectedTopicId === null) {
      return;
    }

    await this.loadCards();
  }

  private async loadCards() {
    if (this.selectedTopicId === null) {
      return;
    }

    this.isLoadingCards = true;
    this.changeDetectorRef.detectChanges();

    try {
      const cards =
        await this.dataService.getCards(
          this.selectedTopicId
        );

      this.allCards =
        this.continueSession
          ? cards.filter(
              card => !card.learned
            )
          : cards;

      const topic =
        this.topics.find(
          topic =>
            topic.id === this.selectedTopicId
        );

      this.topicName =
        topic?.name || '';
    } catch (error) {
      console.error(
        'STUDY SESSION LOAD CARDS ERROR:',
        error
      );

      this.allCards = [];
    } finally {
      this.isLoadingCards = false;
      this.changeDetectorRef.detectChanges();
    }
  }

  toggleMode(key: ModeKey) {
    if (this.selectedModes.has(key)) {
      this.selectedModes.delete(key);
    } else {
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
    return this.allCards[
      this.currentCardIndex
    ];
  }

  get phaseLabel(): string {
    const mode =
      this.availableModes.find(
        item =>
          item.key === this.currentMode
      );

    return mode?.label || '';
  }

  startSession() {
    if (!this.canStart) {
      return;
    }

    this.currentCardIndex = 0;
    this.passedCount = 0;

    this.sessionStarted = true;
    this.sessionFinished = false;

    this.showLernAnswer = false;

    this.passedModesByCard.clear();
    this.triedModesByCard.clear();

    for (const card of this.allCards) {
      this.passedModesByCard.set(
        card.id,
        new Set<ModeKey>()
      );

      this.triedModesByCard.set(
        card.id,
        new Set<ModeKey>()
      );
    }

    this.startCurrentCard();
  }

  private startCurrentCard() {
    const card =
      this.currentPhaseCard;

    if (!card) {
      this.finishSession();
      return;
    }

    this.currentCardModes =
      this.shuffle(
        Array.from(
          this.selectedModes
        )
      );

    this.currentMode = null;

    this.phaseCards = [card];
    this.phaseCardIndex = 0;

    this.startNextModeForCurrentCard();
  }

  private startNextModeForCurrentCard() {
    const card =
      this.currentPhaseCard;

    if (!card) {
      this.finishSession();
      return;
    }

    const triedModes =
      this.triedModesByCard.get(
        card.id
      ) ??
      new Set<ModeKey>();

    const remainingModes =
      this.currentCardModes.filter(
        mode =>
          !triedModes.has(mode)
      );

    if (remainingModes.length === 0) {
      this.completeCurrentCard();
      return;
    }

    this.currentMode =
      remainingModes[
        Math.floor(
          Math.random() *
          remainingModes.length
        )
      ];

    this.resetCurrentMode();

    if (this.currentMode === 'memory') {
      this.setupMemoryPhase();
    }

    if (this.currentMode === 'mc') {
      this.setupMcOptions();
    }

    this.changeDetectorRef.detectChanges();
  }

  private resetCurrentMode() {
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

  get memoryBatchProgress(): string {
    return '1 / 1';
  }

  revealLernAnswer() {
    this.showLernAnswer = true;
    this.changeDetectorRef.detectChanges();
  }

  toggleAnswerFirst(): void {
    this.answerFirst =
      !this.answerFirst;

    this.showLernAnswer = false;

    if (
      this.sessionStarted &&
      !this.sessionFinished &&
      this.currentMode === 'mc'
    ) {
      this.setupMcOptions();
      this.mcSelected = null;
      this.mcAnswered = false;
    }

    this.changeDetectorRef.detectChanges();
  }

  markLern(pass: boolean): void {
    const card =
      this.currentPhaseCard;

    const mode =
      this.currentMode;

    if (
      !card ||
      mode !== 'lernmodus'
    ) {
      return;
    }

    this.markModeTried(
      card.id,
      mode
    );

    if (pass) {
      this.markCurrentModePassed();
    } else {
      this.startNextModeForCurrentCard();
    }
  }

  checkQuizAnswer() {
    const card =
      this.currentPhaseCard;

    if (
      !card ||
      this.quizUserAnswer.trim() === ''
    ) {
      return;
    }

    const correctAnswer =
      this.answerFirst
        ? card.question
        : card.answer;

    const userAnswer =
      this.normalize(
        this.quizUserAnswer
      );

    this.quizIsCorrect =
      userAnswer ===
      this.normalize(
        correctAnswer
      );

    this.quizShowResult = true;

    this.changeDetectorRef.detectChanges();
  }

  nextQuizCard() {
    if (!this.quizShowResult) {
      return;
    }

    const card =
      this.currentPhaseCard;

    const mode =
      this.currentMode;

    if (
      !card ||
      mode !== 'quiz'
    ) {
      return;
    }

    this.markModeTried(
      card.id,
      mode
    );

    if (this.quizIsCorrect) {
      this.markCurrentModePassed();
    } else {
      this.startNextModeForCurrentCard();
    }
  }

  selectMcOption(option: string) {
    if (this.mcAnswered) {
      return;
    }

    const card =
      this.currentPhaseCard;

    if (!card) {
      return;
    }

    this.mcSelected = option;
    this.mcAnswered = true;

    this.changeDetectorRef.detectChanges();
  }

  nextMcCard() {
    if (!this.mcAnswered) {
      return;
    }

    const card =
      this.currentPhaseCard;

    const mode =
      this.currentMode;

    if (
      !card ||
      mode !== 'mc'
    ) {
      return;
    }

    const correctAnswer =
      this.answerFirst
        ? card.question
        : card.answer;

    const isCorrect =
      this.mcSelected === correctAnswer;

    this.markModeTried(
      card.id,
      mode
    );

    if (isCorrect) {
      this.markCurrentModePassed();
    } else {
      this.startNextModeForCurrentCard();
    }
  }

  isCorrectMcOption(
    option: string
  ): boolean {
    const card =
      this.currentPhaseCard;

    if (!card) {
      return false;
    }

    const correctAnswer =
      this.answerFirst
        ? card.question
        : card.answer;

    return option === correctAnswer;
  }

  private setupMcOptions() {
    const card =
      this.currentPhaseCard;

    if (!card) {
      return;
    }

    const correctAnswer =
      this.answerFirst
        ? card.question
        : card.answer;

    const wrongAnswers =
      this.shuffle(
        this.allCards
          .filter(
            current =>
              current.id !== card.id
          )
          .map(
            current =>
              this.answerFirst
                ? current.question
                : current.answer
          )
          .filter(
            answer =>
              answer !== correctAnswer
          )
      ).slice(0, 3);

    this.mcOptions =
      this.shuffle([
        correctAnswer,
        ...wrongAnswers
      ]);
  }

  private setupMemoryPhase() {
    const card =
      this.currentPhaseCard;

    if (!card) {
      return;
    }

    const tiles: MemoryTile[] = [
      {
        tileId:
          this.nextTileId++,
        cardId: card.id,
        text: card.question,
        isFlipped: false,
        isMatched: false
      },
      {
        tileId:
          this.nextTileId++,
        cardId: card.id,
        text: card.answer,
        isFlipped: false,
        isMatched: false
      }
    ];

    this.memoryTiles =
      this.shuffle(tiles);

    this.memoryFlipped = [];
    this.memoryBusy = false;

    this.changeDetectorRef.detectChanges();
  }

  selectMemoryTile(
    tile: MemoryTile
  ) {
    if (
      this.memoryBusy ||
      tile.isFlipped ||
      tile.isMatched
    ) {
      return;
    }

    tile.isFlipped = true;
    this.memoryFlipped.push(tile);

    this.changeDetectorRef.detectChanges();

    if (
      this.memoryFlipped.length !== 2
    ) {
      return;
    }

    this.memoryBusy = true;

    const [
      first,
      second
    ] = this.memoryFlipped;

    const card =
      this.currentPhaseCard;

    if (!card) {
      return;
    }

    const isCorrect =
      first.cardId === second.cardId &&
      (
        first.text === card.question ||
        first.text === card.answer
      ) &&
      (
        second.text === card.question ||
        second.text === card.answer
      );

    if (isCorrect) {
      first.isMatched = true;
      second.isMatched = true;

      this.changeDetectorRef.detectChanges();

      setTimeout(() => {
        this.memoryFlipped = [];
        this.memoryBusy = false;

        this.markModeTried(
          card.id,
          'memory'
        );

        this.markCurrentModePassed();

        this.changeDetectorRef.detectChanges();
      }, 500);
    } else {
      setTimeout(() => {
        first.isFlipped = false;
        second.isFlipped = false;

        this.memoryFlipped = [];
        this.memoryBusy = false;

        this.markModeTried(
          card.id,
          'memory'
        );

        this.startNextModeForCurrentCard();

        this.changeDetectorRef.detectChanges();
      }, 900);
    }
  }

  private markModeTried(
    cardId: string,
    mode: ModeKey
  ) {
    const triedModes =
      this.triedModesByCard.get(
        cardId
      ) ??
      new Set<ModeKey>();

    triedModes.add(mode);

    this.triedModesByCard.set(
      cardId,
      triedModes
    );
  }

  private markCurrentModePassed() {
    const card =
      this.currentPhaseCard;

    const mode =
      this.currentMode;

    if (!card || !mode) {
      return;
    }

    const passedModes =
      this.passedModesByCard.get(
        card.id
      ) ??
      new Set<ModeKey>();

    passedModes.add(mode);

    this.passedModesByCard.set(
      card.id,
      passedModes
    );

    this.startNextModeForCurrentCard();
  }

  private completeCurrentCard() {
    if (
      this.currentCardIndex <
      this.allCards.length - 1
    ) {
      this.currentCardIndex++;

      this.phaseCards = [
        this.allCards[
          this.currentCardIndex
        ]
      ];

      this.phaseCardIndex = 0;
      this.currentMode = null;

      this.startCurrentCard();
    } else {
      this.finishSession();
    }
  }

  private async finishSession() {
    if (
      this.selectedTopicId === null
    ) {
      return;
    }

    const topicId =
      this.selectedTopicId;

    const results =
      this.allCards.map(
        card => {
          const passedModes =
            this.passedModesByCard.get(
              card.id
            ) ??
            new Set<ModeKey>();

          const passed =
            this.selectedModes.size > 0 &&
            Array.from(
              this.selectedModes
            ).every(
              mode =>
                passedModes.has(mode)
            );

          return {
            cardId: card.id,
            passed
          };
        }
      );

    try {
      if (this.continueSession) {
        await Promise.all(
          results
            .filter(
              result =>
                result.passed
            )
            .map(
              result =>
                this.dataService.setCardLearned(
                  topicId,
                  result.cardId,
                  true
                )
            )
        );
      } else {
        await Promise.all(
          results.map(
            result =>
              this.dataService.setCardLearned(
                topicId,
                result.cardId,
                result.passed
              )
          )
        );
      }

      const allTopicCards =
        await this.dataService.getCards(
          topicId
        );

      const learnedCount =
        allTopicCards.filter(
          card =>
            card.learned
        ).length;

      const totalCards =
        allTopicCards.length;

      this.allCards =
        allTopicCards;

      this.passedCount =
        learnedCount;

      await this.dataService.saveStudySessionResult(
        topicId,
        this.topicName,
        learnedCount,
        totalCards,
        Array.from(
          this.selectedModes
        )
      );
    } catch (error) {
      console.error(
        'STUDY SESSION SAVE ERROR:',
        error
      );
    }

    this.sessionFinished = true;
    this.currentMode = null;

    this.changeDetectorRef.detectChanges();
  }

  restart() {
    this.sessionStarted = false;
    this.sessionFinished = false;

    this.currentCardIndex = 0;
    this.currentMode = null;
    this.currentCardModes = [];

    this.passedModesByCard.clear();
    this.triedModesByCard.clear();

    this.passedCount = 0;
    this.showLernAnswer = false;

    this.resetCurrentMode();

    this.changeDetectorRef.detectChanges();
  }

  private normalize(
    answer: string
  ): string {
    return answer
      .trim()
      .toLowerCase()
      .replace(
        /\s+/g,
        ' '
      );
  }

  private shuffle<T>(
    items: T[]
  ): T[] {
    const result = [...items];

    for (
      let i = result.length - 1;
      i > 0;
      i--
    ) {
      const j =
        Math.floor(
          Math.random() *
          (i + 1)
        );

      [
        result[i],
        result[j]
      ] = [
        result[j],
        result[i]
      ];
    }

    return result;
  }
}