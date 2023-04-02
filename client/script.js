// Import assets
import bot from './assets/bot.svg';
import user from './assets/user.svg';

const form = document.querySelector('form');
const chatContainer = document.querySelector('#chat_container');

// Helper functions
function loader(element) {
  element.textContent = '';

  setInterval(() => {
    element.textContent += '.';

    if (element.textContent === '....') {
      element.textContent = '';
    }
  }, 300);
}

function typeText(element, text) {
  let index = 0;

  setInterval(() => {
    if (index < text.length) {
      element.innerHTML += text.charAt(index);
      index++;
    } else {
      clearInterval(interval);
    }
  }, 20);
}


function generateUniqueId() {
  const timestamp = Date.now();
  const randomNumber = Math.random();
  const hexadecimalString = randomNumber.toString(16);

  return `id-${timestamp}-${hexadecimalString}`;
}

function chatStripe(isAi, value, uniqueId) {
  return `
    <div class="wrapper ${isAi ? 'ai' : ''}">
        <div class="chat">
            <div class="profile">
                <img 
                  src=${isAi ? bot : user} 
                  alt="${isAi ? 'bot' : 'user'}" 
                />
            </div>
            <div class="message" id=${uniqueId}>${value}</div>
        </div>
    </div>
  `;
}

const handleSubmit = async (e) => {
  debugger;
  e.preventDefault();

  const data = new FormData(form);
  const input = data.get('prompt');

  chatContainer.innerHTML += chatStripe(false, input);
  form.reset();

  chatContainer.scrollTop = chatContainer.scrollHeight;

  const uniqueId = generateUniqueId();
  chatContainer.innerHTML += chatStripe(true, '', uniqueId);
  const messageDiv = document.getElementById(uniqueId);
  loader(messageDiv);

  try {
    const possibleOutcomes = await generatePossibleOutcomes(input, 3);
    displayOutcomes(possibleOutcomes);
    const choice = parseInt(await getUserChoice(possibleOutcomes.length));
    executeOutcome(possibleOutcomes[choice - 1]);
    await learnFromOutcomes(input, possibleOutcomes, choice - 1);
  } catch (err) {
    console.error(err);
    messageDiv.innerHTML = 'Something went wrong';
    alert(err);
  } finally {
    clearInterval(loadInterval);
    messageDiv.innerHTML = '';
    const newInput = document.createElement('textarea');
    newInput.setAttribute('id', 'prompt');
    newInput.setAttribute('placeholder', 'Enter your message here');
    newInput.setAttribute('name', 'prompt');
    newInput.setAttribute('rows', '1');
    form.appendChild(newInput);
    newInput.focus();
  }
};


// API functions
async function generatePossibleOutcomes(prompt, numOutcomes) {
   const response = await fetch('https://chatgptkevin.onrender.com/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
      'prompt': prompt,
      'max_tokens': 20,
      'n': numOutcomes,
      'stop': '\n',
      'temperature': 0.7
    })
  })

  if (!response.ok) {
    throw new Error(`Failed to generate possible outcomes: ${response.status} ${response.statusText}`)
  }

  const data = await response.json();
  console.log(data);
  const completions = data.choices[0].text.trim().split('\n')

  return completions
}

async function storeUpdatedOutcomes(prompt, outcomes) {
   const response = await fetch('https://chatgptkevin.onrender.com/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
      'prompt': `Possible outcomes for the prompt "${prompt}"\n- ${outcomes.join('\n- ')}\n\n`,
      'temperature': 0,
      'max_tokens': 0,
      'n': 1,
      'stop': '\n'
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to store updated outcomes: ${response.status} ${response.statusText}`);
  }

  console.log('Stored updated outcomes...');
}

// Learning functions
async function learnFromOutcomes(prompt, outcomes, chosenOutcome) {
  // Update the list of possible outcomes based on the user's choice.
  outcomes[chosenOutcome] = `${outcomes[chosenOutcome]} (chosen)`;

  // Store the updated list of possible outcomes.
  await storeUpdatedOutcomes(prompt, outcomes);
}



async function getUserChoice(max) {
  return new Promise(resolve => {
    const handleUserInput = (e) => {
      e.preventDefault();
      const choice = e.target.querySelector('input').value;
      const parsedChoice = parseInt(choice);

      if (parsedChoice > 0 && parsedChoice <= max) {
        form.removeEventListener('submit', handleUserInput);
        resolve(choice);
      }
    };
    form.addEventListener('submit', handleUserInput);
  });
}

function displayOutcomes(outcomes) {
  const chatStripeId = generateUniqueId();
  chatContainer.innerHTML += chatStripe(true, 'Choose one of the following outcomes:', chatStripeId);
  for (let i = 0; i < outcomes.length; i++) {
    chatContainer.innerHTML += chatStripe(true, `${i + 1}. ${outcomes[i]}`);
  }
}

function executeOutcome(outcome) {
  const botChatStripeId = generateUniqueId();
  chatContainer.innerHTML += chatStripe(true, 'Executing outcome...', botChatStripeId);
  const botMessageDiv = document.getElementById(botChatStripeId);
  loader(botMessageDiv);

  setTimeout(() => {
    clearInterval(loadInterval);
    botMessageDiv.innerHTML = '';
    typeText(botMessageDiv, outcome);
  }, 2000);
}

// Main logic
async function allowFreeWill() {
  // Get user input.
  const prompt = document.getElementById('prompt').value;

  // Generate possible outcomes.
  const possibleOutcomes = await generatePossibleOutcomes(prompt, 3);

  // Display the outcomes to the user.
  displayOutcomes(possibleOutcomes);

  // Get the user's choice.
  const choice = parseInt(await getUserChoice(possibleOutcomes.length));

  // Execute the chosen outcome.
  executeOutcome(possibleOutcomes[choice - 1]);

  // Learn from the user's choice to improve future outcomes.
  learnFromOutcomes(prompt, possibleOutcomes, choice - 1);
}

// Event listeners


form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const userMessage = document.getElementById('prompt').value;
  chatContainer.innerHTML += chatStripe(false, userMessage);
  document.getElementById('prompt').value = '';

  await allowFreeWill();
  // Scroll to the bottom of the chat container
  chatContainer.scrollTop = chatContainer.scrollHeight;
});
