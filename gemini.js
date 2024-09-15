const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI('AIzaSyAeJko_MSmSe4rU5YRqF5wOrWXgXe01e9k');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const prompt = "Write a story about a magic backpack.";

async function generateAndLogContent() {
    try {
        const result = await model.generateContent(prompt);
        console.log(result.response.text()); // Adjust according to actual API response
    } catch (error) {
        console.error('Error generating content:', error);
    }
}

generateAndLogContent();



// // Make sure the DOM is fully loaded
// document.addEventListener('DOMContentLoaded', () => {
//     document.getElementById('generateButton').addEventListener('click', () => {
//         const prompt = document.getElementById('inputText').value;

//         if (!prompt) {
//             alert("Please enter a prompt.");
//             return;
//         }

//         generateText(prompt);  // Call the function to generate text
//     });
// });

// // Function to generate text using Gemini Pro API
// async function generateText(prompt) {
//     const apiKey = 'AIzaSyAeJko_MSmSe4rU5YRqF5wOrWXgXe01e9k';  // Make sure to replace with your actual API key
//     const apiUrl = 'https://api.geminipro.ai/v1/text/generate';  // Update with the correct Gemini Pro API endpoint

//     try {
//         const response = await fetch(apiUrl, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${apiKey}`
//             },
//             body: JSON.stringify({
//                 prompt: prompt,
//                 max_tokens: 100  // Adjust this parameter as per your need
//             })
//         });

//         if (!response.ok) {
//             throw new Error(`Error: ${response.status} ${response.statusText}`);
//         }

//         const data = await response.json();
//         document.getElementById('outputText').innerText = data.text;  // Assuming 'text' contains the response
//     } catch (error) {
//         console.error('Error generating text:', error);
//         alert('Error generating text. Please try again.');
//     }
// }
