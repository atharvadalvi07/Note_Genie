let auth0Client = null;

// Initialize Auth0
const configureAuth0 = async () => {
    auth0Client = await createAuth0Client({
        domain: 'dev-02akvxvvandknq1a.us.auth0.com',  // Replace with your Auth0 domain
        client_id: 'aTalPBkMfiRnuZjbTznccMu6ndJffsSN',  // Replace with your Auth0 client ID
        cacheLocation: 'localstorage', // Optional: use localStorage instead of memory
    });
};

// Handle login
const login = async () => {
    await auth0Client.loginWithRedirect({
        redirect_uri: window.location.origin
    });
};

// Handle logout
const logout = () => {
    auth0Client.logout({
        returnTo: window.location.origin
    });
};

// Check if the user is authenticated
const checkAuthentication = async () => {
    const isAuthenticated = await auth0Client.isAuthenticated();
    if (isAuthenticated) {
        const user = await auth0Client.getUser();
        document.getElementById('user-profile').textContent = `Welcome, ${user.name}`;
        document.getElementById('login-button').style.display = 'none';
        document.getElementById('logout-button').style.display = 'block';
    } else {
        document.getElementById('user-profile').textContent = 'Please log in';
        document.getElementById('login-button').style.display = 'block';
        document.getElementById('logout-button').style.display = 'none';
    }
};

// Handle redirection after login
const handleRedirectCallback = async () => {
    const query = window.location.search;
    if (query.includes('code=') && query.includes('state=')) {
        await auth0Client.handleRedirectCallback();
        window.history.replaceState({}, document.title, '/');
    }
};

// Initialize everything
window.onload = async () => {
    await configureAuth0();
    await handleRedirectCallback();
    await checkAuthentication();
};

document.getElementById('login-button').addEventListener('click', login);
document.getElementById('logout-button').addEventListener('click', logout);

const DG_ENDPOINT = 'wss://api.deepgram.com/v1/listen?smart_format=true&model=nova-2&language=en-US&interim_results=true&punctuate=true&endpointing=true';
const DEEPGRAM_API_KEY = '00573d9da7514ea322c5fbaa740b15d829556be9';
const OPEXAMS_API_KEY = 'LyNrJ1e8M_qqNGCAOsmBo9SlFhwSWhA'; // Replace with your actual API key
const OPEXAMS_API_ENDPOINT = 'https://api.opexams.com/questions-generator';

// WebSocket setup function
function setupWebSocket() {
  const ws = new WebSocket(DG_ENDPOINT, ['token', DEEPGRAM_API_KEY]);
  
  ws.onopen = () => log('WebSocket connection opened');
  ws.onerror = (error) => log(`WebSocket error: ${error.message}`);
  ws.onclose = () => log('WebSocket connection closed');
  
  return ws;
}

// Global variables
let mediaRecorder;
let socket;
let stream;

// DOM elements
const audioButton = document.getElementById('audio-button');
const summarizeButton = document.getElementById('summarize-button');
const transcriptionElement = document.getElementById('transcription');
const summaryElement = document.getElementById('summary-text');
const quizElement = document.getElementById('quiz-questions');

function log(message) {
  console.log(message);
}

async function setupMediaRecorder() {
  try {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return new MediaRecorder(stream, { mimeType: 'audio/webm' });
  } catch (error) {
    log(`Error setting up MediaRecorder: ${error.message}`);
    return null;
  }
}

function setupWebSocket() {
  const ws = new WebSocket(DG_ENDPOINT, ['token', '00573d9da7514ea322c5fbaa740b15d829556be9']);
  
  ws.onopen = () => log('WebSocket connection opened');
  ws.onerror = (error) => log(`WebSocket error: ${error.message}`);
  ws.onclose = () => log('WebSocket connection closed');
  
  return ws;
}

async function initializeRecording() {
  log('Initializing recording...');
  mediaRecorder = await setupMediaRecorder();
  if (!mediaRecorder) {
    log('Failed to initialize MediaRecorder');
    return false;
  }
  
  socket = setupWebSocket();
  
  mediaRecorder.ondataavailable = async (event) => {
    if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
      socket.send(event.data);
    }
  };
  
  socket.onmessage = (message) => {
    const data = JSON.parse(message.data);
    const { channel, is_final } = data;
    const transcript = channel.alternatives[0].transcript;
    
    if (transcript && is_final) {
      transcriptionElement.textContent += ' ' + transcript;
    }
  };

  log('Recording initialized successfully');
  return true;
}

let isRecording = false;

audioButton.addEventListener('click', async () => {
  if (!isRecording) {
    log('Starting recording...');
    const initialized = await initializeRecording();
    if (!initialized) {
      log('Failed to start recording');
      return;
    }

    try {
      mediaRecorder.start(250);
      log('MediaRecorder started');
      audioButton.textContent = 'Stop Listening';
      isRecording = true;
      updateWaveAnimation(true);
      summarizeButton.disabled = true;
    } catch (error) {
      log(`Error starting MediaRecorder: ${error.message}`);
      isRecording = false;
    }
  } else {
    log('Stopping recording...');
    try {
      mediaRecorder.stop();
      log('MediaRecorder stopped');
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
      audioButton.textContent = 'Start Audio';
      isRecording = false;
      updateWaveAnimation(false);
      summarizeButton.disabled = false;
    } catch (error) {
      log(`Error stopping MediaRecorder: ${error.message}`);
    }
  }
});

summarizeButton.addEventListener('click', () => {
  const text = transcriptionElement.textContent.trim();
  if (text) {
    summarizeText(text);
  } else {
    log('No text to summarize');
    summaryElement.textContent = 'No text available for summarization.';
  }
});

function summarizeText(text) {
  log('Requesting summary...');

  fetch('https://api.deepgram.com/v1/read?summarize=true&language=en', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${DEEPGRAM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })
  .then(response => {
    log(`Summary response status: ${response.status}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    const summary = data.results.summary.text;
    log('Summary received');
    log(`Summary: ${summary}`);
    summaryElement.textContent = summary || 'No summary available.';
    
    // Create mind map from the summary
    createMindMap(summary);

    // Generate quiz questions using Gemini Pro
    generateQuizQuestions(summary);
  })
  .catch(error => {
    log(`Error generating summary: ${error.message}`);
    summaryElement.textContent = `Error generating summary: ${error.message}`;
  });
}


function updateWaveAnimation(isActive) {
  const waves = document.querySelectorAll('.wave');
  waves.forEach(wave => {
    wave.style.opacity = isActive ? '1' : '0';
  });
}

// Mind map functionality using GoJS
function createMindMap(summary) {
  const $ = go.GraphObject.make;
  
  // Initialize the Diagram
  const myDiagram = $(go.Diagram, "mind_map", {
    "undoManager.isEnabled": true,
    layout: $(go.TreeLayout, { angle: 90, layerSpacing: 35 })
  });

  // Define a simple Node template
  myDiagram.nodeTemplate =
    $(go.Node, "Auto",
      $(go.Shape, "RoundedRectangle", { fill: "#EEEEEE" }),
      $(go.TextBlock, { margin: 8 },
        new go.Binding("text", "text"))
    );

  // Create the model data
  const sentences = summary.split(/[.!?]+/).filter(s => s.trim() !== '');
  const nodeDataArray = [
    { key: "root", text: "Summary" }
  ];

  sentences.forEach((sentence, index) => {
    nodeDataArray.push({ key: `s${index}`, parent: "root", text: sentence.trim() });
  });

  // Create the model from the nodeDataArray
  myDiagram.model = new go.TreeModel(nodeDataArray);
}

// Initialize the audio button
// Mind map functionality using GoJS
function createMindMap(summary) {
  if (typeof go === 'undefined') {
    console.error('GoJS is not loaded. Please check your script inclusion.');
    return;
  }

  const $ = go.GraphObject.make;
  
  // Initialize the Diagram
  const myDiagram = $(go.Diagram, "mind_map", {
    "undoManager.isEnabled": true,
    layout: $(go.TreeLayout, { angle: 90, layerSpacing: 35 })
  });

  // Define a simple Node template
  myDiagram.nodeTemplate =
    $(go.Node, "Auto",
      $(go.Shape, "RoundedRectangle", { fill: "#EEEEEE" }),
      $(go.TextBlock, { margin: 8 },
        new go.Binding("text", "text"))
    );

  // Create the model data
  const sentences = summary.split(/[.!?]+/).filter(s => s.trim() !== '');
  const nodeDataArray = [
    { key: "root", text: "Summary" }
  ];
  console.log('array', nodeDataArray);

  sentences.forEach((sentence, index) => {
    nodeDataArray.push({ key: `s${index}`, parent: "root", text: sentence.trim() });
  });

  // Create the model from the nodeDataArray
  myDiagram.model = new go.TreeModel(nodeDataArray);
}

async function getAccessToken() {
  const auth = new GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

async function generateQuizQuestions(summary) {
  try {
    const response = await fetch(OPEXAMS_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': OPEXAMS_API_KEY
      },
      body: JSON.stringify({
        type: 'contextBased',
        context: summary,
        questionType: 'MCQ',
        language: 'Auto',
        difficulty: 'medium'
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
    }

    const data = await response.json();
    
    // Format the questions and answers
    const formattedQuestions = data.data.map(q => `
      Q: ${q.question}
      A: ${q.answer}
      Options: ${q.options.join(', ')}
    `).join('\n');

    log('Quiz questions generated');
    log(`Quiz questions: ${formattedQuestions}`);
    quizElement.textContent = formattedQuestions;
  } catch (error) {
    log(`Error generating quiz questions: ${error.message}`);
    quizElement.textContent = `Error generating quiz questions: ${error.message}`;
  }
}

// Initialize the audio button
audioButton.disabled = false;
