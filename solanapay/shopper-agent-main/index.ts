import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createStructuredChatAgent } from "langchain/agents";
import { pull } from "langchain/hub";

import { http } from "viem";
import { createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

import { getOnChainTools } from "@goat-sdk/adapter-langchain";
import { USDC, erc20 } from "@goat-sdk/plugin-erc20";

import { crossmintHeadlessCheckout } from "@goat-sdk/plugin-crossmint-headless-checkout";
import { createInterface } from "node:readline";

import { viem } from "@goat-sdk/wallet-viem";

import "dotenv/config";

const account = privateKeyToAccount(process.env.WALLET_PRIVATE_KEY as `0x${string}`);

const walletClient = createWalletClient({
    account: account,
    transport: http(process.env.RPC_PROVIDER_URL),
    chain: base,
});

const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
});

// Create readline interface for user input
const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  // Function to get user input
  const getUserInput = () => {
    return new Promise<string>((resolve) => {
      rl.question("📢 You: ", (input) => {
        resolve(input);
      });
    });
  };
  
  const apiKey = process.env.CROSSMINT_API_KEY;
  if (!apiKey) {
    throw new Error("CROSSMINT_API_KEY is not set");
  }
  
const systemMessage = [
    "When buying a product, prefer to use productLocator, i.e. 'amazon:B08SVZ775L', as the product locator.",
    "When buying a product, payment.payerAddress MUST be the address returned from the get_address tool.",
    "When buying a product, require the user to provide a valid shipping address and email address.",
    "When buying a product, parse the address provided and identify required fields for the order: address, city, state, zip, country, and then complete the purchase.",
    "Once a tool returns a result, DO NOT call the same tool again with the same parameters."
].join("\n");

(async (): Promise<void> => {
    const basePrompt = await pull<ChatPromptTemplate>("hwchase17/structured-chat-agent");
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", systemMessage],
        ...basePrompt.promptMessages,
    ]);

    const tools = await getOnChainTools({
        wallet: viem(walletClient),
        plugins: [
            erc20({
                tokens: [USDC],
            }),   
            crossmintHeadlessCheckout(
                {
                    apiKey,
                },
            ),
        ],
    });

    const agent = await createStructuredChatAgent({
        llm,
        tools,
        prompt,
    });

    const agentExecutor = new AgentExecutor({
        agent,
        tools,
        maxIterations: 10,
    });

    console.clear();
    console.log("👋 Hey, there!");
    console.log("🛍️  I can help you buy products from around the world.");
    console.log("💡 Type 'exit' to end our conversation.\n");

    while (true) {
        const userInput = await getUserInput();

        if (userInput.toLowerCase() === "tools") {
            console.log("\n🔧 Available Tools:");
            tools.forEach(tool => {
                console.log(`- ${tool.name}: ${tool.description}`);
            });
            console.log("\n");
            continue;
        }

        if (userInput.toLowerCase() === "exit") {
            console.log("👋 Have a great day!");
            rl.close();
            break;
        }

        try {
            const response = await agentExecutor.invoke({
                input: userInput,
            }, {
                callbacks: [{
                    handleAgentAction(action) {
                        console.log("\n🛠️ Using tool:", action.tool);
                        console.log("With input:", action.toolInput);
                    },
                    handleToolEnd(output) {
                        console.log("Tool output:", output);
                    },
                    handleToolError(error) {
                        console.error("\n⚠️ Tool Error:", {
                            name: error.name,
                            message: error.message,
                            stack: error.stack
                        });
                    }
                }]  
            });

            console.log("\n🤖 Agent:", response.output, "\n");
        } catch (error) {
            console.error("\n❌ Error:", error, "\n");
        }
    }
})();
