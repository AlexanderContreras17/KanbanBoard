using KanbanBoard.Models;
using KanbanBoard.Service;
using System;
using System.Windows;

namespace KanbanBoard
{
    public partial class MainWindow : Window
    {
        private readonly KanbanServer server;

        public MainWindow()
        {
            InitializeComponent();
            server = new KanbanServer();
            server.CardReceived += OnCardReceived;
            server.CardUpdated += OnCardUpdated;
        }

        private void OnCardReceived(Card card)
        {
            Dispatcher.Invoke(() =>
            {
                LogTextBox.AppendText($"New card added: {card.Title} by {card.Author} in {card.Column}\n");
            });
        }

        private void OnCardUpdated(Card card)
        {
            Dispatcher.Invoke(() =>
            {
                LogTextBox.AppendText($"Card updated: {card.Title} moved to {card.Column}\n");
            });
        }

        private void StartServerButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                server.Start();
                StartServerButton.IsEnabled = false;
                StopServerButton.IsEnabled = true;
                LogTextBox.AppendText("Server started at http://localhost:35000/kanban/\n");
            }
            catch (Exception ex)
            {
                LogTextBox.AppendText($"Error starting server: {ex.Message}\n");
                MessageBox.Show(ex.Message, "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void StopServerButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                server.Stop();
                StartServerButton.IsEnabled = true;
                StopServerButton.IsEnabled = false;
                LogTextBox.AppendText("Server stopped\n");
            }
            catch (Exception ex)
            {
                LogTextBox.AppendText($"Error stopping server: {ex.Message}\n");
                MessageBox.Show(ex.Message, "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }
    }
}