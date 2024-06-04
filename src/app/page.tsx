"use client";

import { type CoreMessage } from "ai";
import { useChat } from "ai/react";
import { useState, useRef, useEffect } from "react";
import { continueConversation } from "./actions";
import { readStreamableValue } from "ai/rsc";
import ReactMarkdown from "react-markdown";

import styles from "./components/styles.module.scss";

declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

export default function Chat() {
  const { isLoading } = useChat();
  const recognitionRef = useRef(null);
  const [messages, setMessages] = useState<CoreMessage[]>([]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false); // Add loading state
  const [isListening, setIsListening] = useState<boolean>(false);

  // listening
  useEffect(() => {
    if ("webkitSpeechRecognition" in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = "en-US";
      recognition.continuous = true; // Continuous recognition
      // recognition.interimResults = true; // Capture interim results

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
      };

      if (isListening) {
        recognition.start();
        recognition.onresult = (event: any) => {
          const currentTranscript = event.results[0][0].transcript;
          setInput((prevValue) => `${prevValue} ${currentTranscript}`.trim());
        };
      } else {
        recognition.stop();
      }

      return () => {
        recognition.stop();
      };
    } else {
      console.log("Speech recognition not supported");
    }
  }, [isListening]);

  const handleStartListening = (event: any) => {
    event.preventDefault();
    setIsListening(true);
  };

  const handleStopListening = (event: any) => {
    event.preventDefault();
    setIsListening(false);
  };

  // Effect to reset loading state when messages change
  useEffect(() => {
    setLoading(false);
  }, [messages]);

  // speaking
  // function speak(text: any) {
  //   let utterance = new SpeechSynthesisUtterance();
  //   // let voicesArray = speechSynthesis.getVoices();
  //   // if (voicesArray.length > 2) {
  //   //   utterance.voice = voicesArray[2];
  //   // }
  //   var voices = window.speechSynthesis.getVoices();
  //   utterance.voice = voices[2];
  //   // utterance.volume = 1; // From 0 to 1
  //   // utterance.rate = 1; // From 0.1 to 10
  //   // utterance.pitch = 2; // From 0 to 2
  //   utterance.text = text;
  //   window.speechSynthesis.speak(utterance);
  // }

  // converting text into something readable for text to speech
  function cleanAndFormatText(text:any) {
    // Remove asterisks and extra whitespace
    const cleanedText = text.replace(/\*\s*/g, "").trim();
    // Replace newlines with spaces to ensure sentences are continuous
    const formattedText = cleanedText
      .replace(/\n+/g, " ")
      .replace(/ {2,}/g, " ");
    return formattedText;
  }

  function splitTextIntoChunks(text: any, chunkSize = 200) {
    const sentences = text.split(/(?<=\.)\s+/);
    let chunks = [];
    let currentChunk = "";

    sentences.forEach((sentence: any) => {
      if (currentChunk.length + sentence.length <= chunkSize) {
        currentChunk += sentence + " ";
      } else {
        chunks.push(currentChunk.trim());
        currentChunk = sentence + " ";
      }
    });

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  function speak(text: any) {
    const synth = window.speechSynthesis;
    let voicesArray = synth.getVoices();

    if (voicesArray.length === 0) {
      // Voices are not loaded yet
      synth.onvoiceschanged = () => {
        voicesArray = synth.getVoices();
        speakWithVoices(text, voicesArray);
      };
    } else {
      // Voices are already loaded
      speakWithVoices(text, voicesArray);
    }
  }

  function speakWithVoices(text: any, voicesArray: any) {
    const chunks = splitTextIntoChunks(text);
    chunks.forEach((chunk) => {
      let utterance = new SpeechSynthesisUtterance(chunk);
      if (voicesArray.length > 2) {
        utterance.voice = voicesArray[2]; // Choose a different voice if desired
      }
      speechSynthesis.speak(utterance);
    });
  }

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {messages.map(
        (m, i) => (
          console.log(cleanAndFormatText(m.content as string)),
          (
            <div key={i} className="whitespace-pre-wrap">
              {m.role === "user" ? (
                <div className="flex items-center gap-x-6">
                  <img
                    className="h-16 w-16 rounded-full"
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                    alt=""
                  />
                  <div className="bg-[#ADD8E6] p-4 rounded-lg shadow-md">
                    <ReactMarkdown className="text-sm font-semibold leading-6 text-600">
                      {m.content as string}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <>
                  <ReactMarkdown className="bg-[#90EE90] my-8 p-4 rounded-lg">
                    {m?.content as string}
                  </ReactMarkdown>
                  <div className="flex justify-center my-4">
                    <button
                      disabled={isLoading}
                      className="shadow-md flex justify-center items-center mx-2 rounded-full w-16 h-16"
                      onClick={() =>
                        speak(cleanAndFormatText(m?.content as string))
                      }
                    >
                      <svg
                        className="m-3"
                        style={{ width: "inherit", height: "inherit" }}
                      >
                        <use href="/speaker.svg#speaker" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        )
      )}

      <form
        className="flex justify-center"
        onSubmit={async (e) => {
          // Changed action to onSubmit for form submission
          e.preventDefault(); // Prevent default form submission behavior
          setLoading(true); // Set loading state to true

          const newMessages: CoreMessage[] = [
            ...messages,

            { content: input, role: "user" },
          ];

          setMessages(newMessages);
          setInput("");
          const result = await continueConversation(newMessages);
          for await (const content of readStreamableValue(result)) {
            setMessages([
              ...newMessages,
              {
                role: "assistant",
                content: content as string,
              },
            ]);
          }

          setLoading(false); // Reset loading state after conversation completes
        }}
      >
        <div className="fixed bottom-0 my-8 flex justify-center gap-4 items-center">
          <input
            className="w-full max-w-md p-4 border border-gray-300 rounded shadow-xl"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What's on your mind..."
            disabled={loading} // Disable input field while loading
          />
          <span
            className={`border bg-white flex cursor-pointer justify-center items-center border-gray-300 h-16 w-16 rounded-full shadow-xl ${
              isListening ? styles.pulse : ""
            }`}
            onClick={isListening ? handleStopListening : handleStartListening}
          >
            <svg
              className="m-2"
              style={{ width: "inherit", height: "inherit" }}
            >
              <use
                href={
                  !isListening
                    ? "/microphone.svg#mic"
                    : "/microphone-disabled.svg#mic-d"
                }
              />
            </svg>
          </span>
        </div>
        {loading && <p>Loading...</p>}
        {/* Render loading indicator when loading is true */}
      </form>
    </div>
  );
}
