namespace Lernkarten.Api.Models;

public sealed class User
{
    public Guid Id { get; set; }

    public required string Username { get; set; }

    public required string Email { get; set; }

    public required string PasswordHash { get; set; }

    public List<CardSet> Sets { get; set; } = [];
}