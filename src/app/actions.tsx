// Add the "use server" directive at the top of the file to mark the function as a Server Action.
"use server";

import { createStreamableValue } from "ai/rsc";
import { CoreMessage, streamText } from "ai";
import { google } from "@ai-sdk/google";

// Define and export an async function (continueConversation) that takes one argument, messages, which is an array of type CoreMessage.
// The messages variable contains a history of the conversation between you and the chatbot and will provide the chatbot with the necessary context to make the next generation.
export async function continueConversation(messages: CoreMessage[]) {
  // Call the streamText function which is imported from the ai package.
  // To use this function, you pass it a configuration object that contains a model provider (imported from @ai-sdk/openai) and messages (defined in step 2). You can pass additional settings to further customise the model's behaviour.
  const result = await streamText({
    model: google("models/gemini-pro"),
    messages,
  });

  // Create a streamable value using the createStreamableValue function imported from the ai/rsc package.
  // To use this function you pass the model's response as a text stream which can be accessed directly on the model response object (result.textStream).
  const stream = createStreamableValue(result.textStream);
  //   Finally, return the value of the stream (stream.value).
  return stream.value;
}