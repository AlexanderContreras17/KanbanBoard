using System;
using System.Linq;
using System.Text.Json.Serialization;

namespace KanbanBoard.Models
{
    public class Card
    {
        public static readonly string[] ValidColumns = { "todo", "inprogress", "done" };
        
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Title { get; set; } = "";
        public string Author { get; set; } = "";
        public string Column { get; set; } = "todo";
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public string UserId { get; set; } = "";

        // Add a method to validate the card
        public bool IsValid()
        {
            return !string.IsNullOrWhiteSpace(Title) &&
                   !string.IsNullOrWhiteSpace(Author) &&
                   !string.IsNullOrWhiteSpace(Column) &&
                   ValidColumns.Contains(Column.ToLower());
        }

        public string GetValidationError()
        {
            if (string.IsNullOrWhiteSpace(Title))
                return "Title is required";
            if (string.IsNullOrWhiteSpace(Author))
                return "Author is required";
            if (string.IsNullOrWhiteSpace(Column))
                return "Column is required";
            if (!ValidColumns.Contains(Column.ToLower()))
                return $"Invalid column value '{Column}'. Must be one of: {string.Join(", ", ValidColumns)}";
            return string.Empty;
        }
    }
}
