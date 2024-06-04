import { google } from "@ai-sdk/google";
// Allows you to stream additional data to the client.
import { StreamingTextResponse, streamText, StreamData } from "ai";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: google("models/gemini-pro"),
    messages,
  });

  // Creating a new instance of StreamData.
  const data = new StreamData();
  // Append the data you want to stream alongside the model's response.
  data.append({ test: "value" });
  // Create a new AI stream with the toAIStream method on the StreamTextResult object.
  const stream = result.toAIStream({
    onFinal(_) {
      data.close();
    },
  });
  // Pass the data alongside the stream to the new StreamingTextResponse.
  return new StreamingTextResponse(stream, {}, data);
}