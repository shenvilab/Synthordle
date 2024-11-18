// General Parameters
var width = 4; //number of reactions (always 4 for difficult reactions)
var row = 0; //current guess (current attempt #)
var col = 0; //current "letter" for the attempt
var numChoices = 14; //Number of reagents shown on the "keyboard" Full keyboard = 14, minimum = 4
var intermediatesRevealed;
var takingInput = true; //Turn to false while animating to avoid extra input
var gameOver = false;
var maxReactionID;

// Variables that the user can change
var reactionID;
var numGuesses = 4;  // Default number of guesses
var isForward = false;  // Default direction is retro
var difficulty = true; //True: Hard, False: Easy

// Variables to hold the previous settings
var previousReactionID;
var previousNumGuesses;
var previousIsForward;
var previousDifficulty;


//////////////////////////FUNCTIONS///////////////////////////
document.addEventListener('DOMContentLoaded', async function () {
  // Check orientation on page load and listen for orientation changes
  window.addEventListener('load', checkOrientation);
  window.addEventListener('resize', checkOrientation);

  // Safely add event listeners only if elements exist
  const gearIcon = document.getElementById('gearIcon');
  const aboutIcon = document.getElementById('aboutIcon');
  const saveButton = document.getElementById('saveSettings');
  const cancelButton = document.getElementById('cancelButton');
  const closeButton = document.getElementById('closeButton');
  const reactionSlider = document.getElementById('reactionID');
  const IDValueDisplay = document.getElementById('IDValue');
  const guessSlider = document.getElementById('numGuesses');
  const guessValueDisplay = document.getElementById('guessValue');

  // Add event listeners if elements are found
  if (gearIcon) gearIcon.addEventListener('click', showSettingsModal);
  if (aboutIcon) aboutIcon.addEventListener('click', showAboutModal);
  if (closeButton) closeButton.addEventListener('click', hideAboutModal);
  if (saveButton) saveButton.addEventListener('click', saveSettings);
  if (cancelButton) cancelButton.addEventListener('click', cancelSettings);

  // Set up slider event listeners if sliders exist
  if (reactionSlider && IDValueDisplay) {
    reactionSlider.addEventListener('input', function () {
      IDValueDisplay.textContent = reactionSlider.value;
    });
  }
  if (guessSlider && guessValueDisplay) {
    guessSlider.addEventListener('input', function () {
      guessValueDisplay.textContent = guessSlider.value;
    });
  }

  // Initialize with daily parameters and load default content
  try {
    await setDailyReactionID();  // Wait for async operation
    await fetchParametersAndInitialize();  // Wait for data fetching and initialization
  } catch (error) {
    console.error('Error during initialization:', error);
  }
});




///////////////////////////////////////////////////////////////////////////
//////////////////////////////////MODALS///////////////////////////////////
///////////////////////////////////////////////////////////////////////////

///////Settings///////

//Show
function showSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    // Store previous settings before showing the modal
    previousReactionID = reactionID;
    previousNumGuesses = numGuesses;
    previousIsForward = isForward;
    previousDifficulty = difficulty;
    modal.style.display = 'flex';  // Show modal
  }
}

// Hide
function hideSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.style.display = 'none';  // Hide modal
  } else {
    console.error("Modal not found when trying to hide it!");
  }
}

//Cancel
function cancelSettings() {
  // Revert to previous settings
  reactionID = previousReactionID;
  numGuesses = previousNumGuesses;
  isForward = previousIsForward;
  difficulty = previousDifficulty;
  // Optionally, reset the input fields in the modal
  document.getElementById('reactionID').value = previousReactionID;
  document.getElementById('numGuesses').value = previousNumGuesses;
  document.getElementById('direction').value = isForward ? 'forward' : 'retro';
  document.getElementById('difficulty').value = difficulty ? 'hard' : 'easy';
  hideSettingsModal();
}

//Save
function saveSettings() {
  const reactionInput = document.getElementById('reactionID').value;
  const guessesInput = document.getElementById('numGuesses').value;
  const directionInput = document.getElementById('direction').value;
  const difficultyInput = document.getElementById('difficulty').value;

  reactionID = reactionInput ? parseInt(reactionInput) : 0;
  numGuesses = guessesInput ? parseInt(guessesInput) : 4;
  isForward = directionInput === 'forward';
  difficulty = difficultyInput === 'hard';
  const board = document.getElementById('board');
  const keyboard = document.getElementById('keyboard');
  board.innerHTML = '';  // Clears the old board
  keyboard.innerHTML = '';  // Clears the old keyboard

  // escape reagents from JSON file and initialize the board
  fetchParametersAndInitialize();

  hideSettingsModal();
}


///////ABOUT///////

//Show
function showAboutModal() {
  const about = document.getElementById('aboutModal');
  if (about) {
    about.style.display = 'flex';  // Show modal
  }
}

//Hide
function hideAboutModal() {
  const modal = document.getElementById('aboutModal');
  if (modal) {
    modal.style.display = 'none';  // Hide modal
  } else {
    console.error("Modal not found when trying to hide it!");
  }
}

////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////INITIALIZE////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

function initializeBoard(answer, reagents, reference) {
  row = 0; //Reset row to 0
  col = 0; //Reset column to 0
  takingInput = true; // Reset takingInput to true
  gameOver = false; // Reset gameOver to false

  window.answer = answer;

  const gridData = create2DArray(); 
  const board = document.getElementById('board');
  const keyboard = document.getElementById("keyboard");
  const fragment = document.createDocumentFragment();
  const ref = document.getElementById("reference");
  
  ref.innerHTML = reference;


  //First column
  if (isForward) {
    fragment.appendChild(createStart());
  } else {
    fragment.appendChild(createProduct());
  }

  //intermediates
  gridData.forEach((columnData, index) => {
    const column = createColumn(columnData, index);
    fragment.appendChild(column);
    if (index < gridData.length - 1) {
      if (isForward) {
        fragment.appendChild(createIntermediate(index));
      } else {
        fragment.appendChild(createIntermediate(gridData.length - 2 - index));
      }
    }
  });

  //Last Column
  if (isForward) {
    fragment.appendChild(createProduct()); // Add product (TGT) after last column in forward mode
  } else {
    fragment.appendChild(createStart()); // Add starting material (SM) after columns in backward mode
  }

  board.appendChild(fragment);

  // Create Reagent Keyboard
  const keyboardFragment = document.createDocumentFragment();
  reagents.forEach(item => {
    keyboardFragment.appendChild(createReagents(item));
  });
  keyboardFragment.appendChild(createEnter());
  keyboardFragment.appendChild(createDelete());
  keyboard.appendChild(keyboardFragment);
  
  

  // Event listeners
  document.addEventListener("click", handleUserInput);
  document.addEventListener("keydown", handleKeyboardInput);
}

async function fetchParametersAndInitialize() {
  const jsonFile = difficulty ? "Hard/reactions.json" : "Easy/reactions.json";  // Set the appropriate JSON file based on difficulty
  try {
    const response = await fetch(jsonFile);  // Wait for the fetch response
    const data = await response.json();  // Wait for the JSON to be parsed
    const allReagents = data.reagents;
    const answer = data.reactions[reactionID].sequence;
    const reference = data.reactions[reactionID].reference;
    maxReactionID = data.reactions.length - 1; // Calculate max based on the JSON data
    
    const reactionSlider = document.getElementById("reactionID");
    reactionSlider.max = maxReactionID; // Set the max attribute of the slider
    width = answer.length;
    
    if (!isForward) answer.reverse();
    
    const reagents = generateReagents(allReagents, answer, numChoices);
    intermediatesRevealed = setIntermediatesRevealed(width);
    
    initializeBoard(answer, reagents, reference);  // Initialize board after fetching data
  } catch (error) {
    console.error('Error fetching data:', error);  // Handle errors gracefully
  }
}
  

//---------------------------- HELPER FUNCTIONS  ----------------------------//
function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = getRandomInt(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
}



function generateReagents(allReagents, answer, x) {
  // Remove duplicates from `answer` and `allReagents`
  const uniqueAnswer = [...new Set(answer)];
  const uniqueReagentsPool = [...new Set(allReagents)].filter(r => !uniqueAnswer.includes(r));

  // Start with the unique answer reagents
  let reagents = [...uniqueAnswer];

  // Fill `reagents` with random, unique reagents from `uniqueReagentsPool` until it reaches `x` length
  while (reagents.length < x) {
    let randomReagent = uniqueReagentsPool[Math.floor(Math.random() * uniqueReagentsPool.length)];
    if (!reagents.includes(randomReagent)) {
      reagents.push(randomReagent);
    }
  }

  shuffleArray(reagents);
  return reagents;
}

//Create 2D array for createColumn to use
function create2DArray() {
  let array = [];
  for (let i = 0; i < width; i++) {
    let row = [];
    for (let j = 0; j < numGuesses; j++) {
      row.push("");
    }
    array.push(row);
  }
  return array;
}

// Function to create a column of boxes
function createColumn(data, columnNumber) {
  const column = document.createElement('span');
  column.className = 'column';
  let rowNumber = 0;
  data.forEach(item => {
    const box = document.createElement('span');
    box.className = 'box';
    box.id = rowNumber.toString() + "-" + columnNumber.toString();
    rowNumber++;
    column.appendChild(box); // Add each box to the column
  });
  return column;
}

// Function to create boxes for intermediates
function createIntermediate(columnNumber) {
  const intermediate = document.createElement('span');
  intermediate.className = 'intermediate';
  intermediate.id = 'int' + columnNumber.toString()
  return intermediate;
}

// Functions to assign and display SM/Product
function createProduct() {
  const product = document.createElement('span'); // Change 'span' to 'div' for better layout control
  product.classList.add('product'); // Add 'start' class for styling

  // Create the image element
  const image = document.createElement('img');
  if(difficulty){
    image.src = `Hard/Reactions/${reactionID.toString()}/product.png`;
  }else{
    image.src = `Easy/Reactions/${reactionID.toString()}/product.png`;
  }
  image.alt = 'Product Image'; // Update alt text for accessibility

  // Create the text element
  const text = document.createElement('div');
  text.classList.add('text'); // Add 'text' class for styling
  text.textContent = 'TGT'; // Replace with dynamic text if needed

  // Append the image and text to the start element
  product.appendChild(image);
  product.appendChild(text);

  return product;
}

function createStart() {
  const start = document.createElement('div'); // Change 'span' to 'div' for better layout control
  start.classList.add('start'); // Add 'start' class for styling

  // Create the image element
  const image = document.createElement('img');
  if(difficulty){
    image.src = `Hard/Reactions/${reactionID.toString()}/sm.png`;
  }else{
    image.src = `Easy/Reactions/${reactionID.toString()}/sm.png`;
  }
  image.alt = 'Start Image'; // Update alt text for accessibility

  // Create the text element
  const text = document.createElement('div');
  text.classList.add('text'); // Add 'text' class for styling
  text.textContent = 'SM'; // Replace with dynamic text if needed

  // Append the image and text to the start element
  start.appendChild(image);
  start.appendChild(text);

  return start;
}

//Functions to create keyboard buttons
function createEnter() {
  const enter = document.createElement('span');
  enter.classList = 'enter-button img';
  let path = "enter.png"
  enter.innerHTML = `<img src=` + path + ` alt="${enter}">`;
  enter.id = path;
  return enter
}

function createDelete() {
  const deletebutton = document.createElement('span');
  deletebutton.classList = 'delete-button img';
  let path = "backspace.png"
  deletebutton.innerHTML = `<img src=` + path + ` alt="${deletebutton}">`;
  deletebutton.id = path;
  return deletebutton;
}

function createReagents(item) {
  const reagent = document.createElement('span');
  let path;
  if(difficulty){
    path = "Hard/Reagents/" + item + ".png";
  }else{
    path = "Easy/Reagents/" + item + ".png";
  }
  reagent.classList = 'reagent img';
  reagent.innerHTML = `<img src=` + path + ` alt="${item}">`;
  reagent.id = item;
  return reagent
}

function update() {
  takingInput = false;
  let correct = 0;
  // Loop over each box in the current row and flip it with a delay
  for (let c = 0; c < width; c++) {
    (function (c) {
      setTimeout(() => {
        let currTile = document.getElementById(row.toString() + "-" + c.toString());
        currTile.classList.add("flip");
        let keyboardKey = document.getElementById(currTile.title);
        setTimeout(() => {
          let letter = currTile.title;
          if (answer[c] === letter) {
            // Remove "present" and "absent" before marking as "correct"
            keyboardKey.classList.remove("present", "absent");

            currTile.classList.add("correct");
            keyboardKey.classList.add("correct");
            correct += 1;
            revealIntermediate(c, width-1);
          } else if (answer.includes(letter)) {
            if (!keyboardKey.classList.contains("correct")) {
              keyboardKey.classList.add("present");
            }
            currTile.classList.add("present");
          } else {
            if (!keyboardKey.classList.contains("correct") && !keyboardKey.classList.contains("present")) {
              keyboardKey.classList.add("absent");
            }
            currTile.classList.add("absent");
          }
        }, 250); // Wait until the tile is halfway through the flip before changing the class
      }, c * 1000); // Delay for each tile to flip sequentially
    })(c);
  }
  setTimeout(() => {
    if (correct == width) {
      gameOver = true;
    }
    checkGameover();
    takingInput = true;
    row += 1; // Move to the next row
    col = 0; // Reset column
  }, width * 1000); // Delay by the total duration of all flips
}

// Function to show the game over modal
function showGameOverModal(message) {
  const modal = document.getElementById('gameOverModal').style.display = 'flex';;
  const messageElement = document.getElementById('gameOverMessage');
  messageElement.textContent = message;
  modal.display = 'block'; // Show the modal
}

// Function to hide the game over modal
function hideGameOverModal() {
  const modal = document.getElementById('gameOverModal');
  modal.style.display = 'none'; // Hide the modal
}

// Function to show the settings/modal
function playAgain() {
  hideGameOverModal(); // Hide the game over modal first
  //stopFireworks();
  showSettingsModal(); // Call the function to open the settings/modal
}

// Add event listener to play again button
document.getElementById('playAgainButton').addEventListener('click', playAgain);

// Add event listener to restart the game when the restart button is clicked
/*document.getElementById('restartGameButton').addEventListener('click', function() {
  hideGameOverModal();
  initialize(); // Call your initialization function to restart the game
});*/

function checkGameover() {
  if (gameOver) {
    setTimeout(function () {
      showGameOverModal("Success in " + row.toString() + " generation(s)!");
      //showFireworks();
    }, 500);
    return;
  }
  if (row == numGuesses - 1) {
    gameOver = true;
    setTimeout(function () {
      showGameOverModal("Game over!");
    }, 500);
  }
}

function revealIntermediate(c, numIntermediates) {
  // Ensure intermediatesRevealed has the correct length
  if (!Array.isArray(intermediatesRevealed) || intermediatesRevealed.length !== numIntermediates) {
    intermediatesRevealed = Array(numIntermediates).fill(false);
  }

  if (isForward) {
    // Forward mode: reveal based on index `c`
    if (c < numIntermediates && !intermediatesRevealed[c]) {
      revealIntermediateHelper(c);
      intermediatesRevealed[c] = true;
    }
  } else {
    // Reverse mode: reveal in reverse order
    const reverseIndex = numIntermediates - c - 1;
    if (reverseIndex >= 0 && reverseIndex < numIntermediates && !intermediatesRevealed[reverseIndex]) {
      revealIntermediateHelper(reverseIndex);
      intermediatesRevealed[reverseIndex] = true;
    }
  }
}

function revealIntermediateHelper(index) {
  let intermediate = document.getElementById("int" + index);
  let path;
  if(difficulty){
    path = "Hard/Reactions/" + reactionID.toString() + "/int" + index + ".png";
  }else{
    path = "Easy/Reactions/" + reactionID.toString() + "/int" + index + ".png";
  }
  intermediate.innerHTML = `<img src=` + path + ` alt="${intermediate}">`;
  intermediate.classList.add("flip");
  intermediate.style.border = 'none';
}

function handleUserInput(e) {
  if (gameOver || !takingInput) return;
  const targetClass = e.target.classList;
  if (targetClass.contains("reagent")) {
    handleReagent(e.target);
  } else if (targetClass.contains("delete-button")) {
    handleDelete();
  } else if (targetClass.contains("enter-button")) {
    handleEnter();
  }
}

function handleKeyboardInput(e) {
  if (gameOver || !takingInput) return;
  if (e.key == "Backspace") {
    handleDelete();
  } else if (e.key == "Enter"){
    handleEnter();
  }
}

function handleReagent(target) {
  if (col < width) {
    let currTile = document.getElementById(`${row}-${col}`);
    if(difficulty){
      currTile.innerHTML = `<img src="Hard/Reagents/${target.id}.png" alt="${target.id}">`;
    }else{
      currTile.innerHTML = `<img src="Easy/Reagents/${target.id}.png" alt="${target.id}">`;
    }

    currTile.title = target.id;
    col++;
  }
}

function handleDelete() {
  if (col > 0) {
    col--;
    let currTile = document.getElementById(`${row}-${col}`);
    currTile.innerText = "";
  }
}

function handleEnter() {
  if (col === width) {
    update();
  } else {
    showNotification("Not enough guesses!");
  }
}

function showNotification(message) {
  const notificationContainer = document.getElementById('notificationContainer');
  const existingNotifications = notificationContainer.querySelectorAll('.notification');

  // Remove the oldest notification if there are already 3 notifications
  if (existingNotifications.length >= 3) {
    existingNotifications[0].remove(); // Remove the first (oldest) notification
  }

  // Create a new notification element
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;

  // Append the notification to the container
  notificationContainer.appendChild(notification);

  // Set a timeout to remove the notification after a few seconds
  setTimeout(() => {
    notification.classList.add('fade-out'); // Add fade-out class
    setTimeout(() => {
      notification.remove();
    }, 500); // Wait for fade-out effect to finish before removing
  }, 1000); // Duration the notification is displayed (5 seconds)
}


function randomizeReactionId() {
  const randomId = Math.floor(Math.random() * (maxReactionID + 1)); // Generate a random ID between 0 and maxReactionID
  document.getElementById('reactionID').value = randomId; // Set the value of the input box to the random ID
  document.getElementById('IDValue').textContent = randomId;
}

function dailyReactionID(max) {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  const random = Math.sin(dayOfYear) * 10000;
  return Math.floor((random - Math.floor(random)) * max);
}

async function setDailyReactionID() {
  try {
    const response = await fetch("Hard/reactions.json");  // Fetch the reactions.json file
    const data = await response.json();  // Wait for the JSON to be parsed
    maxReactionID = data.reactions.length - 1; // Set maxReactionID based on the number of reactions
    const dailyID = dailyReactionID(maxReactionID);  // Get the daily reaction ID

    reactionID = dailyID;
    document.getElementById('IDValue').textContent = dailyID;  // Update the displayed ID value
    document.getElementById('reactionID').value = dailyID; // Set the value of the input box to the daily ID
  } catch (error) {
    console.error('Error setting daily reaction ID:', error);  // Handle errors gracefully
  }
}



function setIntermediatesRevealed(width){
    const dict = {};
    for (let i = 0; i < width-1; i++) {
      dict[`int${i}`] = false;
    }
    return dict;
  }


function checkOrientation() {
  const rotateMessage = document.getElementById('rotate-message');
  if (window.innerHeight > window.innerWidth) {
      // Portrait mode
      rotateMessage.style.display = 'flex';
  } else {
      // Landscape mode
      rotateMessage.style.display = 'none';
  }
}

