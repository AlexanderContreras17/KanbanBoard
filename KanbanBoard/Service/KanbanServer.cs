using KanbanBoard.Models;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.Json;

namespace KanbanBoard.Service
{
    public class KanbanServer
    {
        private readonly HttpListener server = new();
        private readonly List<Card> cards = new();
        private byte[]? index;
        private byte[]? styles;
        private byte[]? script;
        private readonly JsonSerializerOptions jsonOptions;

        public event Action<Card>? CardReceived;
        public event Action<Card>? CardUpdated;

        public KanbanServer()
        {
            jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                WriteIndented = true
            };
        }

        public void Start()
        {
            server.Prefixes.Add("http://*:35000/kanban/");
            LoadStaticFiles();
            server.Start();

            new Thread(Listen) { IsBackground = true }.Start();
        }

        private void LoadStaticFiles()
        {
            index = File.ReadAllBytes("Assets/index.html");
            styles = File.ReadAllBytes("Assets/styles.css");
            script = File.ReadAllBytes("Assets/script.js");
        }

        private void Listen()
        {
            var context = server.GetContext();
            new Thread(Listen) { IsBackground = true }.Start();

            try
            {
                if (context.Request.HttpMethod == "GET")
                {
                    HandleGetRequest(context);
                }
                else if (context.Request.HttpMethod == "POST" && context.Request.RawUrl == "/kanban/cards")
                {
                    HandleAddCard(context);
                }
                else if (context.Request.HttpMethod == "PUT" && context.Request.RawUrl.StartsWith("/kanban/cards/"))
                {
                    HandleUpdateCard(context);
                }
                else if (context.Request.HttpMethod == "DELETE" && context.Request.RawUrl.StartsWith("/kanban/cards/"))
                {
                    HandleDeleteCard(context);
                }
                else
                {
                    context.Response.StatusCode = (int)HttpStatusCode.NotFound;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error handling request: {ex}");
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            }
            finally
            {
                context.Response.Close();
            }
        }

        private void HandleGetRequest(HttpListenerContext context)
        {
            switch (context.Request.RawUrl)
            {
                case "/kanban/":
                case "/kanban/index":
                    ServeFile(context, index, "text/html");
                    break;
                case "/kanban/styles.css":
                    ServeFile(context, styles, "text/css");
                    break;
                case "/kanban/script.js":
                    ServeFile(context, script, "application/javascript");
                    break;
                case "/kanban/cards":
                    var json = JsonSerializer.Serialize(cards, jsonOptions);
                    var buffer = Encoding.UTF8.GetBytes(json);
                    ServeFile(context, buffer, "application/json");
                    break;
                default:
                    context.Response.StatusCode = (int)HttpStatusCode.NotFound;
                    break;
            }
        }

        private void HandleAddCard(HttpListenerContext context)
        {
            byte[] buffer = new byte[context.Request.ContentLength64];
            context.Request.InputStream.Read(buffer, 0, buffer.Length);
            string json = Encoding.UTF8.GetString(buffer);

            try
            {
                var card = JsonSerializer.Deserialize<Card>(json, jsonOptions);
                if (card == null)
                {
                    SendError(context, "Invalid card data: Card cannot be null");
                    return;
                }

                // Convert column to lowercase before validation
                card.Column = card.Column.ToLower();
                string validationError = card.GetValidationError();
                if (!string.IsNullOrEmpty(validationError))
                {
                    SendError(context, validationError);
                    return;
                }

                cards.Add(card);
                CardReceived?.Invoke(card);

                // Send response
                var responseJson = JsonSerializer.Serialize(card, jsonOptions);
                var responseBuffer = Encoding.UTF8.GetBytes(responseJson);
                ServeFile(context, responseBuffer, "application/json");
            }
            catch (JsonException ex)
            {
                SendError(context, $"Invalid JSON format: {ex.Message}");
            }
        }

        private void HandleUpdateCard(HttpListenerContext context)
        {
            string cardId = context.Request.RawUrl.Split('/').Last();
            byte[] buffer = new byte[context.Request.ContentLength64];
            context.Request.InputStream.Read(buffer, 0, buffer.Length);
            string json = Encoding.UTF8.GetString(buffer);

            try
            {
                var updatedCard = JsonSerializer.Deserialize<Card>(json, jsonOptions);
                if (updatedCard == null)
                {
                    SendError(context, "Invalid card data: Card cannot be null");
                    return;
                }

                // Convert column to lowercase before validation
                updatedCard.Column = updatedCard.Column.ToLower();
                string validationError = updatedCard.GetValidationError();
                if (!string.IsNullOrEmpty(validationError))
                {
                    SendError(context, validationError);
                    return;
                }

                var existingCard = cards.Find(c => c.Id == cardId);
                if (existingCard == null)
                {
                    context.Response.StatusCode = (int)HttpStatusCode.NotFound;
                    return;
                }

                existingCard.Title = updatedCard.Title;
                existingCard.Author = updatedCard.Author;
                existingCard.Column = updatedCard.Column;
                CardUpdated?.Invoke(existingCard);

                var responseJson = JsonSerializer.Serialize(existingCard, jsonOptions);
                var responseBuffer = Encoding.UTF8.GetBytes(responseJson);
                ServeFile(context, responseBuffer, "application/json");
            }
            catch (JsonException ex)
            {
                SendError(context, $"Invalid JSON format: {ex.Message}");
            }
        }

        private void HandleDeleteCard(HttpListenerContext context)
        {
            string cardId = context.Request.RawUrl.Split('/').Last();
            var card = cards.FirstOrDefault(c => c.Id == cardId);

            if (card == null)
            {
                context.Response.StatusCode = (int)HttpStatusCode.NotFound;
                return;
            }

            cards.Remove(card);
            var responseMessage = $"Card with ID {cardId} has been deleted.";
            var buffer = Encoding.UTF8.GetBytes(responseMessage);
            ServeFile(context, buffer, "text/plain");
        }

        private void SendError(HttpListenerContext context, string message)
        {
            context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            var buffer = Encoding.UTF8.GetBytes(message);
            context.Response.ContentType = "text/plain";
            context.Response.ContentLength64 = buffer.Length;
            context.Response.OutputStream.Write(buffer, 0, buffer.Length);
        }

        private void ServeFile(HttpListenerContext context, byte[]? content, string contentType)
        {
            if (content == null)
            {
                context.Response.StatusCode = (int)HttpStatusCode.NotFound;
                return;
            }

            context.Response.ContentLength64 = content.Length;
            context.Response.ContentType = contentType;
            context.Response.OutputStream.Write(content, 0, content.Length);
            context.Response.StatusCode = (int)HttpStatusCode.OK;
        }

        public void Stop()
        {
            if (server.IsListening)
            {
                server.Stop();
            }
        }
    }
}
