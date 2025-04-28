let defaultFormSubmitHandler = null;
let currentUser = localStorage.getItem('KanbanUser') || generateUserId();
function generateUserId() {
    const userId = 'user_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('KanbanUser', userId);
    return userId;
}
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('cardModal');
    const addCardBtn = document.getElementById('addCardBtn');
    const closeBtn = document.querySelector('.close');
    const cardForm = document.getElementById('cardForm');
    const columns = document.querySelectorAll('.column'); 

    console.log('DOM loaded, setting up event listeners');

    loadCardsFromLocalStorage();
     
    addCardBtn.onclick = () => {
        console.log('Add Card button clicked');
        cardForm.reset();
        modal.style.display = 'block';
        document.getElementById('cardTitle').focus();
        restoreDefaultFormSubmit();
    };

    closeBtn.onclick = () => {
        modal.style.display = 'none';
        cardForm.reset();
        restoreDefaultFormSubmit();
    };

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            cardForm.reset();
            restoreDefaultFormSubmit();
        }
    };
     
    defaultFormSubmitHandler = async function (e) {
        e.preventDefault();
        console.log('Form submitted');

        const titleInput = document.getElementById('cardTitle');
        const authorInput = document.getElementById('cardAuthor');
        const columnSelect = document.getElementById('cardColumn');

        if (!titleInput.value.trim() || !authorInput.value.trim() || !columnSelect.value) {
            console.error('All fields are required');
            alert('All fields are required');
            return;
        }

        const card = {
            Id: getNextCardId(),
            Title: titleInput.value.trim(),
            Author: authorInput.value.trim(),
            Column: columnSelect.value.toLowerCase(),
            CreatedAt: new Date().toISOString(),
            UserId: currentUser
        };

        console.log('Sending card data:', JSON.stringify(card));

        try {
            const response = await fetch('/kanban/cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(card)
            });

            if (response.ok) {
                const newCard = await response.json();
                addCardToBoard(newCard);
                saveCardsToLocalStorage();
                cardForm.reset();
                modal.style.display = 'none';  
            } else {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                alert('Error adding card: ' + errorText);
            }
        } catch (error) {
            console.error('Error adding card:', error);
            alert('Error adding card: ' + error.message);
        }
    };

    cardForm.onsubmit = defaultFormSubmitHandler;

    setupDragAndDrop();
    setInterval(checkForUpdates, 2000);
});

function setupDragAndDrop() {
    const cards = document.querySelectorAll('.card');
    const columns = document.querySelectorAll('.column');
     
    cards.forEach(card => {
        card.removeEventListener('dragstart', handleDragStart);
        card.removeEventListener('dragend', handleDragEnd);
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });
     
    columns.forEach(column => {
        column.removeEventListener('dragover', handleDragOver);
        column.removeEventListener('dragleave', handleDragLeave);
        column.removeEventListener('drop', handleDrop);
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('dragleave', handleDragLeave);
        column.addEventListener('drop', handleDrop);
    });
}

function restoreDefaultFormSubmit() {
    const cardForm = document.getElementById('cardForm');
    if (defaultFormSubmitHandler) {
        cardForm.onsubmit = defaultFormSubmitHandler;
    }
}
 
function Guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = (c == 'x' ? r : (r & 0x3 | 0x8));
        return v.toString(16);
    });
}
 
function saveCardsToLocalStorage() {
    const cards = Array.from(document.querySelectorAll('.card')).map(card => {
        try {
            return JSON.parse(card.dataset.card);
        } catch (e) {
            console.error('Error parsing card data:', e);
            return null;
        }
    }).filter(card => card !== null);

    localStorage.setItem('kanbanCards', JSON.stringify(cards));
    console.log('Cards saved to local storage:', cards);
}
 
function loadCardsFromLocalStorage() {
    const savedCards = localStorage.getItem('kanbanCards');
    if (savedCards) {
        try {
            const cards = JSON.parse(savedCards);
            console.log('Loading cards from local storage:', cards);
            updateBoard(cards);
        } catch (e) {
            console.error('Error loading cards from local storage:', e);
        }
    }
}

let lastCardsJSON = '';

async function checkForUpdates() {
    try {
        const response = await fetch('/kanban/cards');
        const cards = await response.json();
        const newCardsJSON = JSON.stringify(cards);

        if (newCardsJSON !== lastCardsJSON) {
            updateBoard(cards);
            saveCardsToLocalStorage();
            lastCardsJSON = newCardsJSON;
        } else {
            console.log('No changes detected, skipping update.');
        }
    } catch (error) {
        console.error('Error checking for updates:', error);
    }
}

function updateBoard(cards) {
    document.querySelectorAll('.cards-container').forEach(container => {
        container.innerHTML = '';
    });

    cards.forEach(card => {
        addCardToBoard(card);
    });
}
function getNextCardId() {
    let lastId = parseInt(localStorage.getItem('kanbanLastCardId') || '0', 10);
    lastId += 1;
    localStorage.setItem('kanbanLastCardId', lastId);
    return lastId;
}

function addCardToBoard(card) {
    if (!card) {
        console.error('Invalid card data:', card);
        return;
    }

    if (typeof card === 'string') {
        try {
            card = JSON.parse(card);
        } catch (e) {
            console.error('Failed to parse card string:', e);
            return;
        }
    }

    const columnId = (card.Column || '').toString().toLowerCase();

    if (!columnId) {
        console.error('Invalid column value:', card);
        return;
    }

    const column = document.querySelector(`#${columnId} .cards-container`);

    if (column) {
        const cardElement = createCardElement(card);
        column.appendChild(cardElement);
         
        setupDragAndDrop();
    } else {
        console.error('Column not found for card:', card);
    }
}


function createCardElement(card) {
    const title = card.Title || 'Untitled';
    const author = card.Author || 'Unknown';
    const createdAt = card.CreatedAt ? new Date(card.CreatedAt) : new Date();
    if (!card.UserId) {
        card.UserId = currentUser;
    }
    const isOwner = card.UserId === currentUser;
    console.log('Card ownership:', { currentUser, cardUserId: card.UserId, isOwner });

    const div = document.createElement('div');
    div.className = 'card';
    div.draggable = isOwner;
    div.dataset.id = card.Id;
    div.dataset.card = JSON.stringify(card);

    const formattedDate = createdAt.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

    div.innerHTML = `
    <h3>${escapeHtml(title)}</h3>
    <p>By: ${escapeHtml(author)}</p>
    <p>Card ID: ${escapeHtml(card.Id.toString())}</p>

    <p>Created: ${formattedDate}</p>
    <div class="card-actions"></div>
`;


    const actionsDiv = div.querySelector('.card-actions');

    if (isOwner) {
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => editCard(div));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => deleteCard(div));

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
    }

    return div;
}

function editCard(cardElement) {
    const cardData = JSON.parse(cardElement.dataset.card);
    const modal = document.getElementById('cardModal');
    const cardForm = document.getElementById('cardForm');

    document.getElementById('cardTitle').value = cardData.Title;
    document.getElementById('cardAuthor').value = cardData.Author;
    document.getElementById('cardColumn').value = cardData.Column;
    document.querySelector('#cardModal h2').textContent = 'Edit Task';
    modal.style.display = 'block';

    cardForm.onsubmit = async (e) => {
        e.preventDefault();

        cardData.Title = document.getElementById('cardTitle').value.trim();
        cardData.Author = document.getElementById('cardAuthor').value.trim();
        cardData.Column = document.getElementById('cardColumn').value.toLowerCase();

        try {
            const response = await fetch(`/kanban/cards/${cardData.Id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cardData)
            });

            if (response.ok) {
                const updatedCard = await response.json();
                cardElement.dataset.card = JSON.stringify(updatedCard);
                 
                const newColumn = document.getElementById(updatedCard.Column).querySelector('.cards-container');
                newColumn.appendChild(cardElement);

                cardElement.querySelector('h3').innerText = updatedCard.Title;
                cardElement.querySelector('p').innerText = `By: ${updatedCard.Author}`;

                saveCardsToLocalStorage();
                modal.style.display = 'none';
                cardForm.reset();

                restoreDefaultFormSubmit();
            } else {
                alert('Error updating card');
            }
        } catch (error) {
            console.error('Error updating card:', error);
        }
    };
}

async function deleteCard(cardElement) {
    const cardData = JSON.parse(cardElement.dataset.card);

    const cardTitle = cardData.Title || 'Untitled';
    const cardAuthor = cardData.Author || 'Unknown';

    const cardInfoToDelete = document.getElementById('cardInfoToDelete');
    cardInfoToDelete.innerHTML = `<strong>Title:</strong> ${escapeHtml(cardTitle)}<br><strong>Author:</strong> ${escapeHtml(cardAuthor)}`;

    const confirmDeleteModal = document.getElementById('confirmDeleteModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const closeDeleteModalBtn = document.querySelector('#confirmDeleteModal .close'); 

    confirmDeleteModal.style.display = 'block';

    confirmDeleteBtn.onclick = async () => {
        const cardId = cardElement.dataset.id;

        try {
            const response = await fetch(`/kanban/cards/${cardId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                cardElement.remove();
                removeCardFromLocalStorage(cardId);
                console.log('Card deleted successfully');
                confirmDeleteModal.style.display = 'none';
            } else {
                alert('Error deleting card');
            }
        } catch (error) {
            console.error('Error deleting card:', error);
        }
    };

    cancelDeleteBtn.onclick = () => {
        confirmDeleteModal.style.display = 'none';
    };
     
    closeDeleteModalBtn.onclick = () => {
        confirmDeleteModal.style.display = 'none';
    };
     
    window.onclick = (event) => {
        if (event.target === confirmDeleteModal) {
            confirmDeleteModal.style.display = 'none';
        }
    };
}

function removeCardFromLocalStorage(cardId) {
    let cards = JSON.parse(localStorage.getItem('kanbanCards')) || [];
    cards = cards.filter(card => card.Id !== cardId); 
     
    localStorage.setItem('kanbanCards', JSON.stringify(cards));

    console.log('Card removed from local storage');
}

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') {
        return '';
    }
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function setupDragAndDrop() {
    const cards = document.querySelectorAll('.card');
    const columns = document.querySelectorAll('.column');

    cards.forEach(card => {
        card.removeEventListener('dragstart', handleDragStart);
        card.removeEventListener('dragend', handleDragEnd);
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });

    columns.forEach(column => {
        column.removeEventListener('dragover', handleDragOver);
        column.removeEventListener('dragleave', handleDragLeave);
        column.removeEventListener('drop', handleDrop);
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('dragleave', handleDragLeave);
        column.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', e.target.dataset.id);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}


function handleDragOver(e) {
    e.preventDefault();  
    const column = e.target.closest('.column');
    if (column) {
        column.classList.add('dragover');
    }
}
function handleDragLeave(e) {
    const column = e.target.closest('.column');
    if (column) {
        column.classList.remove('dragover');
    }
}
function handleDrop(e) {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain');
    const card = document.querySelector(`[data-id="${cardId}"]`);
    const column = e.target.closest('.column');

    if (column && card) { 
        const cardsContainer = column.querySelector('.cards-container');
        cardsContainer.appendChild(card);
         
        const updatedCard = JSON.parse(card.dataset.card);
        updatedCard.Column = column.id.toLowerCase(); 
         
        fetch(`/kanban/cards/${updatedCard.Id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedCard)
        })
            .then(response => {
                if (response.ok) {
                    console.log('Card updated successfully');
                    saveCardsToLocalStorage();  
                } else {
                    console.error('Failed to update card');
                }
            })
            .catch(console.error);
    }
}
