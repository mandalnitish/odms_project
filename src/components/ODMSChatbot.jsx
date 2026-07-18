// ----------------------------------------------
// src/components/ODMSChatbot.jsx
// NixBot - Persistent Firebase Chat
// ----------------------------------------------

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  Send,
  Bot,
  User,
  Sparkles,
  Square,
  Cloud,
  CloudOff,
  Check,
} from "lucide-react";

import { onAuthStateChanged } from "firebase/auth";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

// IMPORTANT:
// Change this path only if your firebase.js file
// is located somewhere else.
import { auth, db } from "../firebase";

/* =========================================================
   WELCOME MESSAGE
========================================================= */

const createWelcomeMessage = () => ({
  id: crypto.randomUUID(),

  type: "bot",

  text: `Hello! I'm your AI-powered Organ Donation Assistant. I can help you with:

• Understanding organ donation process
• Eligibility criteria
• Debunking common myths
• Guiding you through registration
• Answering general questions

How can I assist you today?`,

  timestamp: new Date(),
});

/* =========================================================
   MAIN COMPONENT
========================================================= */

const ODMSChatbot = () => {
  /* =========================================================
     STATE
  ========================================================= */

  const [messages, setMessages] = useState([
    createWelcomeMessage(),
  ]);

  const [input, setInput] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const [isStreaming, setIsStreaming] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);

  const [authLoading, setAuthLoading] = useState(true);

  const [chatLoaded, setChatLoaded] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [lastSaved, setLastSaved] = useState(false);

  /* =========================================================
     REFS
  ========================================================= */

  const chatContainerRef = useRef(null);

  const abortControllerRef = useRef(null);

  const revealIntervalRef = useRef(null);

  const saveStatusTimerRef = useRef(null);

  const GROQ_API_KEY =
    import.meta.env.VITE_GROQ_API_KEY;

  /* =========================================================
     SYSTEM PROMPT
  ========================================================= */

  const SYSTEM_PROMPT = `
You are NixBot, an expert AI assistant for an Organ Donor Management System.

Your job is to provide accurate, helpful, compassionate, and easy-to-understand information about organ donation.

You are primarily assisting users in India.

You can help with:

- Organ donation eligibility
- Organ donation registration
- Living organ donation
- Deceased organ donation
- Organ transplantation
- Common organ donation myths
- General information about NOTTO
- Organ donation procedures
- Ethical concerns
- General religious concerns

Response style:

- Respond naturally like a modern AI assistant.
- Use simple and clear language.
- Keep answers reasonably concise.
- Use short paragraphs.
- Use bullet points when useful.
- Do not unnecessarily repeat the user's question.
- Be empathetic but professional.
- Never provide a medical diagnosis.
- Never guarantee that someone is medically eligible to donate.
- Final donor eligibility must be determined by qualified medical and transplant professionals.
- Recommend professional medical advice when appropriate.
`;

  /* =========================================================
     FIREBASE AUTH + LOAD SAVED CHAT

     This runs every time:
     - App starts
     - Page refreshes
     - User logs in
     - User logs out
  ========================================================= */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,

      async (user) => {
        setAuthLoading(true);

        setChatLoaded(false);

        if (user) {
          console.log(
            "NixBot logged-in user:",
            user.uid
          );

          setCurrentUser(user);

          await loadChatHistory(user.uid);
        } else {
          console.log(
            "NixBot running as guest"
          );

          setCurrentUser(null);

          setMessages([
            createWelcomeMessage(),
          ]);

          setChatLoaded(true);
        }

        setAuthLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  /* =========================================================
     LOAD CHAT FROM FIRESTORE

     Firestore structure:

     chatHistory
        |
        └── Firebase_UID
              |
              ├── userId
              ├── userEmail
              ├── messages
              └── updatedAt
  ========================================================= */

  const loadChatHistory = async (userId) => {
    try {
      console.log(
        "Loading NixBot chat for:",
        userId
      );

      const chatRef = doc(
        db,
        "chatHistory",
        userId
      );

      const snapshot =
        await getDoc(chatRef);

      /* ===============================================
         SAVED CHAT EXISTS
      =============================================== */

      if (snapshot.exists()) {
        const data = snapshot.data();

        console.log(
          "Saved NixBot chat found:",
          data
        );

        if (
          Array.isArray(data.messages) &&
          data.messages.length > 0
        ) {
          const restoredMessages =
            data.messages.map(
              (message) => ({
                id:
                  message.id ||
                  crypto.randomUUID(),

                type:
                  message.type,

                text:
                  message.text || "",

                timestamp:
                  message.timestamp
                    ? new Date(
                        message.timestamp
                      )
                    : new Date(),
              })
            );

          setMessages(
            restoredMessages
          );
        } else {
          setMessages([
            createWelcomeMessage(),
          ]);
        }
      } else {
        /* =============================================
           FIRST CHAT FOR THIS USER
        ============================================= */

        console.log(
          "No saved NixBot chat found."
        );

        const welcomeMessage =
          createWelcomeMessage();

        setMessages([
          welcomeMessage,
        ]);

        /*
          Create initial Firestore document.
        */

        await saveInitialChat(
          userId,
          auth.currentUser,
          [welcomeMessage]
        );
      }
    } catch (error) {
      console.error(
        "Failed to load NixBot chat:",
        error
      );

      setMessages([
        createWelcomeMessage(),
      ]);
    } finally {
      setChatLoaded(true);
    }
  };

  /* =========================================================
     CREATE INITIAL CHAT DOCUMENT
  ========================================================= */

  const saveInitialChat = async (
    userId,
    user,
    initialMessages
  ) => {
    if (!userId) {
      return;
    }

    try {
      const chatRef = doc(
        db,
        "chatHistory",
        userId
      );

      const cleanMessages =
        initialMessages.map(
          (message) => ({
            id: message.id,

            type: message.type,

            text: message.text,

            timestamp:
              message.timestamp instanceof Date
                ? message.timestamp.getTime()
                : Date.now(),
          })
        );

      await setDoc(
        chatRef,

        {
          userId,

          userEmail:
            user?.email || null,

          messages:
            cleanMessages,

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        },

        {
          merge: true,
        }
      );

      console.log(
        "Initial NixBot chat created."
      );
    } catch (error) {
      console.error(
        "Failed to create initial NixBot chat:",
        error
      );
    }
  };

  /* =========================================================
     SAVE CHAT TO FIRESTORE

     IMPORTANT FIX:

     We use auth.currentUser directly.

     This avoids React stale-state issues where
     currentUser may temporarily still be null.
  ========================================================= */

  const saveChatHistory = async (
    messagesToSave
  ) => {
    const user = auth.currentUser;

    /* ===============================================
       GUEST USER
    =============================================== */

    if (!user?.uid) {
      console.log(
        "NixBot chat not saved: guest user."
      );

      return false;
    }

    try {
      setIsSaving(true);

      setLastSaved(false);

      const chatRef = doc(
        db,
        "chatHistory",
        user.uid
      );

      /* ===============================================
         REMOVE EMPTY STREAMING MESSAGES
      =============================================== */

      const cleanMessages =
        messagesToSave

          .filter(
            (message) =>
              message.text &&
              message.text.trim()
          )

          .map(
            (message) => ({
              id:
                message.id ||
                crypto.randomUUID(),

              type:
                message.type,

              text:
                message.text,

              timestamp:
                message.timestamp instanceof
                Date
                  ? message.timestamp.getTime()
                  : typeof message.timestamp ===
                    "number"
                  ? message.timestamp
                  : Date.now(),
            })
          );

      /* ===============================================
         SAVE
      =============================================== */

      await setDoc(
        chatRef,

        {
          userId:
            user.uid,

          userEmail:
            user.email || null,

          messages:
            cleanMessages,

          updatedAt:
            serverTimestamp(),
        },

        {
          merge: true,
        }
      );

      console.log(
        "NixBot chat saved successfully:",
        user.uid
      );

      setLastSaved(true);

      /* ===============================================
         REMOVE PREVIOUS STATUS TIMER
      =============================================== */

      if (
        saveStatusTimerRef.current
      ) {
        clearTimeout(
          saveStatusTimerRef.current
        );
      }

      /* ===============================================
         HIDE SAVED MESSAGE AFTER 2 SECONDS
      =============================================== */

      saveStatusTimerRef.current =
        setTimeout(() => {
          setLastSaved(false);
        }, 2000);

      return true;
    } catch (error) {
      console.error(
        "Failed to save NixBot chat:",
        error
      );

      return false;
    } finally {
      setIsSaving(false);
    }
  };

  /* =========================================================
     INNER CHAT AUTO SCROLL

     ONLY scrolls the chatbot.
     Does NOT scroll the browser page.
  ========================================================= */

  useEffect(() => {
    const container =
      chatContainerRef.current;

    if (!container) {
      return;
    }

    container.scrollTo({
      top:
        container.scrollHeight,

      behavior:
        "smooth",
    });
  }, [messages]);

  /* =========================================================
     CLEANUP
  ========================================================= */

  useEffect(() => {
    return () => {
      if (
        abortControllerRef.current
      ) {
        abortControllerRef.current.abort();
      }

      if (
        revealIntervalRef.current
      ) {
        clearInterval(
          revealIntervalRef.current
        );
      }

      if (
        saveStatusTimerRef.current
      ) {
        clearTimeout(
          saveStatusTimerRef.current
        );
      }
    };
  }, []);

  /* =========================================================
     BUILD GROQ CHAT HISTORY
  ========================================================= */

  const buildConversationHistory = (
    currentMessages
  ) => {
    return currentMessages

      .filter(
        (message) =>
          message.text?.trim()
      )

      .map(
        (message) => ({
          role:
            message.type === "user"
              ? "user"
              : "assistant",

          content:
            message.text,
        })
      );
  };

  /* =========================================================
     UPDATE STREAMING BOT MESSAGE
  ========================================================= */

  const updateBotMessage = (
    botMessageId,
    text
  ) => {
    setMessages(
      (previousMessages) =>
        previousMessages.map(
          (message) =>
            message.id ===
            botMessageId
              ? {
                  ...message,
                  text,
                }
              : message
        )
    );
  };

  /* =========================================================
     WAIT UNTIL SMOOTH REVEAL COMPLETES
  ========================================================= */

  const waitForRevealToFinish = (
    getReceivedText,
    getDisplayedText
  ) => {
    return new Promise(
      (resolve) => {
        const interval =
          setInterval(() => {
            if (
              getDisplayedText()
                .length >=
              getReceivedText()
                .length
            ) {
              clearInterval(
                interval
              );

              resolve();
            }
          }, 30);
      }
    );
  };

  /* =========================================================
     STREAM AI RESPONSE
  ========================================================= */

  const streamAIResponse = async (
    conversationMessages,
    botMessageId
  ) => {
    const controller =
      new AbortController();

    abortControllerRef.current =
      controller;

    let receivedText = "";

    let displayedText = "";

    let streamFinished = false;

    try {
      /* ===============================================
         SMOOTH CHATGPT-STYLE TEXT REVEAL
      =============================================== */

      revealIntervalRef.current =
        setInterval(() => {
          if (
            displayedText.length <
            receivedText.length
          ) {
            const remaining =
              receivedText.length -
              displayedText.length;

            let charactersToAdd = 1;

            if (remaining > 300) {
              charactersToAdd = 6;
            } else if (
              remaining > 150
            ) {
              charactersToAdd = 4;
            } else if (
              remaining > 60
            ) {
              charactersToAdd = 3;
            } else if (
              remaining > 20
            ) {
              charactersToAdd = 2;
            }

            displayedText =
              receivedText.slice(
                0,

                displayedText.length +
                  charactersToAdd
              );

            updateBotMessage(
              botMessageId,
              displayedText
            );
          }

          if (
            streamFinished &&
            displayedText.length >=
              receivedText.length
          ) {
            if (
              revealIntervalRef.current
            ) {
              clearInterval(
                revealIntervalRef.current
              );

              revealIntervalRef.current =
                null;
            }
          }
        }, 25);

      /* ===============================================
         CALL GROQ
      =============================================== */

      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",

        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${GROQ_API_KEY}`,
          },

          signal:
            controller.signal,

          body:
            JSON.stringify({
              model:
                "llama-3.3-70b-versatile",

              messages: [
                {
                  role:
                    "system",

                  content:
                    SYSTEM_PROMPT,
                },

                ...buildConversationHistory(
                  conversationMessages
                ),
              ],

              temperature:
                0.7,

              max_tokens:
                1000,

              top_p:
                1,

              stream:
                true,
            }),
        }
      );

      /* ===============================================
         API ERROR
      =============================================== */

      if (!response.ok) {
        const errorText =
          await response.text();

        console.error(
          "Groq API Error:",
          response.status,
          errorText
        );

        throw new Error(
          `AI API request failed: ${response.status}`
        );
      }

      if (!response.body) {
        throw new Error(
          "Streaming response unavailable."
        );
      }

      setIsLoading(false);

      setIsStreaming(true);

      /* ===============================================
         READ GROQ STREAM
      =============================================== */

      const reader =
        response.body.getReader();

      const decoder =
        new TextDecoder(
          "utf-8"
        );

      let buffer = "";

      while (true) {
        const {
          done,
          value,
        } =
          await reader.read();

        if (done) {
          break;
        }

        buffer +=
          decoder.decode(
            value,

            {
              stream:
                true,
            }
          );

        const lines =
          buffer.split("\n");

        buffer =
          lines.pop() || "";

        for (
          const line of lines
        ) {
          const trimmedLine =
            line.trim();

          if (
            !trimmedLine ||
            !trimmedLine.startsWith(
              "data:"
            )
          ) {
            continue;
          }

          const data =
            trimmedLine
              .replace(
                /^data:\s*/,
                ""
              )
              .trim();

          if (
            data ===
            "[DONE]"
          ) {
            continue;
          }

          try {
            const parsed =
              JSON.parse(data);

            const token =
              parsed
                ?.choices?.[0]
                ?.delta
                ?.content;

            if (token) {
              receivedText +=
                token;
            }
          } catch (
            parseError
          ) {
            console.warn(
              "Stream parse error:",
              parseError
            );
          }
        }
      }

      /* ===============================================
         HANDLE FINAL BUFFER
      =============================================== */

      const remaining =
        buffer.trim();

      if (
        remaining.startsWith(
          "data:"
        )
      ) {
        const data =
          remaining
            .replace(
              /^data:\s*/,
              ""
            )
            .trim();

        if (
          data &&
          data !== "[DONE]"
        ) {
          try {
            const parsed =
              JSON.parse(data);

            const token =
              parsed
                ?.choices?.[0]
                ?.delta
                ?.content;

            if (token) {
              receivedText +=
                token;
            }
          } catch {
            // Ignore incomplete chunk
          }
        }
      }

      streamFinished = true;

      /* ===============================================
         EMPTY RESPONSE
      =============================================== */

      if (
        !receivedText.trim()
      ) {
        if (
          revealIntervalRef.current
        ) {
          clearInterval(
            revealIntervalRef.current
          );

          revealIntervalRef.current =
            null;
        }

        const fallbackText =
          "I couldn't generate a response. Please try asking your question again.";

        updateBotMessage(
          botMessageId,
          fallbackText
        );

        const finalMessages = [
          ...conversationMessages,

          {
            id:
              botMessageId,

            type:
              "bot",

            text:
              fallbackText,

            timestamp:
              new Date(),
          },
        ];

        await saveChatHistory(
          finalMessages
        );

        return;
      }

      /* ===============================================
         WAIT FOR TYPING ANIMATION
      =============================================== */

      await waitForRevealToFinish(
        () => receivedText,

        () => displayedText
      );

      /* ===============================================
         FINAL AI MESSAGE
      =============================================== */

      updateBotMessage(
        botMessageId,
        receivedText
      );

      const finalBotMessage = {
        id:
          botMessageId,

        type:
          "bot",

        text:
          receivedText,

        timestamp:
          new Date(),
      };

      const finalMessages = [
        ...conversationMessages,

        finalBotMessage,
      ];

      /* ===============================================
         SAVE COMPLETE CHAT TO FIRESTORE

         This is the important persistence step.
      =============================================== */

      await saveChatHistory(
        finalMessages
      );
    } catch (error) {
      /* ===============================================
         CLEAR TYPING TIMER
      =============================================== */

      if (
        revealIntervalRef.current
      ) {
        clearInterval(
          revealIntervalRef.current
        );

        revealIntervalRef.current =
          null;
      }

      /* ===============================================
         USER STOPPED GENERATION
      =============================================== */

      if (
        error.name ===
        "AbortError"
      ) {
        if (
          displayedText.trim()
        ) {
          updateBotMessage(
            botMessageId,
            displayedText
          );

          const partialMessages = [
            ...conversationMessages,

            {
              id:
                botMessageId,

              type:
                "bot",

              text:
                displayedText,

              timestamp:
                new Date(),
            },
          ];

          await saveChatHistory(
            partialMessages
          );
        }

        return;
      }

      /* ===============================================
         ERROR MESSAGE
      =============================================== */

      console.error(
        "AI Streaming Error:",
        error
      );

      const errorText = `I'm having trouble connecting to my AI service right now.

Please try again in a moment.`;

      updateBotMessage(
        botMessageId,
        errorText
      );

      await saveChatHistory([
        ...conversationMessages,

        {
          id:
            botMessageId,

          type:
            "bot",

          text:
            errorText,

          timestamp:
            new Date(),
        },
      ]);
    } finally {
      streamFinished = true;

      setIsLoading(false);

      setIsStreaming(false);

      abortControllerRef.current =
        null;

      if (
        revealIntervalRef.current
      ) {
        clearInterval(
          revealIntervalRef.current
        );

        revealIntervalRef.current =
          null;
      }
    }
  };

  /* =========================================================
     SEND MESSAGE
  ========================================================= */

  const handleSend = async () => {
    const currentInput =
      input.trim();

    if (
      !currentInput ||
      isLoading ||
      isStreaming
    ) {
      return;
    }

    const userMessage = {
      id:
        crypto.randomUUID(),

      type:
        "user",

      text:
        currentInput,

      timestamp:
        new Date(),
    };

    const botMessageId =
      crypto.randomUUID();

    const emptyBotMessage = {
      id:
        botMessageId,

      type:
        "bot",

      text:
        "",

      timestamp:
        new Date(),
    };

    const conversationWithUser = [
      ...messages,

      userMessage,
    ];

    /* ===============================================
       SHOW USER MESSAGE IMMEDIATELY
    =============================================== */

    setMessages([
      ...conversationWithUser,

      emptyBotMessage,
    ]);

    setInput("");

    setIsLoading(true);

    /* ===============================================
       SAVE USER MESSAGE IMMEDIATELY

       If page refreshes while AI is generating,
       the user's question is still preserved.
    =============================================== */

    await saveChatHistory(
      conversationWithUser
    );

    /* ===============================================
       GENERATE AI RESPONSE
    =============================================== */

    await streamAIResponse(
      conversationWithUser,

      botMessageId
    );
  };

  /* =========================================================
     STOP GENERATION
  ========================================================= */

  const handleStop = () => {
    if (
      abortControllerRef.current
    ) {
      abortControllerRef.current.abort();
    }
  };

  /* =========================================================
     ENTER KEY
  ========================================================= */

  const handleKeyDown = (
    event
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      handleSend();
    }
  };

  /* =========================================================
     QUICK QUESTIONS
  ========================================================= */

  const quickActions = [
    {
      label:
        "Eligibility Criteria",

      query:
        "Who is eligible to donate organs?",
    },

    {
      label:
        "How to Register",

      query:
        "How do I register as an organ donor?",
    },

    {
      label:
        "Common Myths",

      query:
        "What are common myths about organ donation?",
    },

    {
      label:
        "Living Donation",

      query:
        "Can I donate organs while alive?",
    },
  ];

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div
      className="
        w-full
        max-w-4xl
        mx-auto
        bg-white
        dark:bg-gray-800
        rounded-2xl
        shadow-xl
        overflow-hidden
        border
        border-gray-200
        dark:border-gray-700
      "
    >
      {/* HEADER */}

      <div
        className="
          bg-green-500
          text-white
          p-6
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
            gap-4
          "
        >
          <div
            className="
              flex
              items-center
              gap-4
            "
          >
            <div
              className="
                bg-white/20
                p-3
                rounded-xl
              "
            >
              <Bot size={32} />
            </div>

            <div>
              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >
                <h2
                  className="
                    font-bold
                    text-2xl
                  "
                >
                  ODMS AI Assistant
                </h2>

                <span
                  className="
                    flex
                    items-center
                    gap-1
                    bg-white/20
                    px-2
                    py-1
                    rounded-full
                    text-xs
                  "
                >
                  <Sparkles size={14} />

                  AI Powered
                </span>
              </div>

              <p
                className="
                  text-white/90
                  text-sm
                "
              >
                Powered by NixBot
              </p>
            </div>
          </div>

          {/* SAVE STATUS */}

          {!authLoading && (
            <div
              className="
                hidden
                sm:flex
                items-center
                gap-2
                bg-white/15
                px-3
                py-2
                rounded-full
                text-xs
              "
            >
              {!currentUser ? (
                <>
                  <CloudOff size={14} />

                  Guest Chat
                </>
              ) : isSaving ? (
                <>
                  <Cloud
                    size={14}
                    className="
                      animate-pulse
                    "
                  />

                  Saving...
                </>
              ) : lastSaved ? (
                <>
                  <Check size={14} />

                  Chat Saved
                </>
              ) : (
                <>
                  <Cloud size={14} />

                  History On
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* LOADING SAVED CHAT */}

      {authLoading ||
      !chatLoaded ? (
        <div
          className="
            h-[500px]
            flex
            items-center
            justify-center
            bg-gray-50
            dark:bg-gray-900
          "
        >
          <motion.div
            animate={{
              rotate: 360,
            }}

            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <Bot
              size={34}
              className="
                text-green-500
              "
            />
          </motion.div>
        </div>
      ) : (
        /* CHAT BOARD */

        <div
          ref={
            chatContainerRef
          }

          className="
            h-[500px]
            overflow-y-auto
            overflow-x-hidden
            p-6
            space-y-4
            bg-gray-50
            dark:bg-gray-900
          "
        >
          <AnimatePresence
            initial={false}
          >
            {messages.map(
              (
                message,
                index
              ) => {
                const streaming =
                  message.type ===
                    "bot" &&
                  index ===
                    messages.length -
                      1 &&
                  isStreaming;

                return (
                  <motion.div
                    key={
                      message.id
                    }

                    initial={{
                      opacity: 0,

                      x:
                        message.type ===
                        "user"
                          ? 20
                          : -20,
                    }}

                    animate={{
                      opacity: 1,
                      x: 0,
                    }}

                    className={`
                      flex
                      gap-3

                      ${
                        message.type ===
                        "user"
                          ? "justify-end"
                          : "justify-start"
                      }
                    `}
                  >
                    {message.type ===
                      "bot" && (
                      <div
                        className="
                          bg-green-500
                          text-white
                          h-10
                          w-10
                          rounded-full
                          flex
                          items-center
                          justify-center
                          flex-shrink-0
                        "
                      >
                        <Bot size={20} />
                      </div>
                    )}

                    <div
                      className={`
                        max-w-[75%]
                        p-4
                        rounded-2xl

                        ${
                          message.type ===
                          "user"
                            ? `
                              bg-green-500
                              text-white
                              rounded-br-sm
                            `
                            : `
                              bg-white
                              dark:bg-gray-800
                              text-gray-800
                              dark:text-gray-100
                              border
                              border-gray-200
                              dark:border-gray-700
                              shadow-sm
                              rounded-bl-sm
                            `
                        }
                      `}
                    >
                      {message.type ===
                        "bot" &&
                      !message.text &&
                      isLoading ? (
                        <div
                          className="
                            flex
                            gap-1.5
                          "
                        >
                          {[0, 1, 2].map(
                            (dot) => (
                              <motion.span
                                key={dot}

                                className="
                                  w-2
                                  h-2
                                  bg-green-500
                                  rounded-full
                                "

                                animate={{
                                  y: [
                                    0,
                                    -5,
                                    0,
                                  ],
                                }}

                                transition={{
                                  repeat:
                                    Infinity,

                                  duration:
                                    0.8,

                                  delay:
                                    dot *
                                    0.15,
                                }}
                              />
                            )
                          )}
                        </div>
                      ) : (
                        <p
                          className="
                            text-sm
                            whitespace-pre-line
                            leading-relaxed
                          "
                        >
                          {message.text}

                          {streaming && (
                            <motion.span
                              animate={{
                                opacity: [
                                  1,
                                  0,
                                  1,
                                ],
                              }}

                              transition={{
                                repeat:
                                  Infinity,

                                duration:
                                  0.7,
                              }}

                              className="
                                text-green-500
                                ml-1
                              "
                            >
                              ▌
                            </motion.span>
                          )}
                        </p>
                      )}

                      {message.text && (
                        <p
                          className={`
                            text-xs
                            mt-2

                            ${
                              message.type ===
                              "user"
                                ? "text-white/70"
                                : "text-gray-400"
                            }
                          `}
                        >
                          {message.timestamp.toLocaleTimeString(
                            [],
                            {
                              hour:
                                "2-digit",

                              minute:
                                "2-digit",
                            }
                          )}
                        </p>
                      )}
                    </div>

                    {message.type ===
                      "user" && (
                      <div
                        className="
                          bg-gray-300
                          dark:bg-gray-600
                          h-10
                          w-10
                          rounded-full
                          flex
                          items-center
                          justify-center
                          flex-shrink-0
                        "
                      >
                        <User size={20} />
                      </div>
                    )}
                  </motion.div>
                );
              }
            )}
          </AnimatePresence>
        </div>
      )}

      {/* QUICK QUESTIONS */}

      {chatLoaded &&
        messages.length <= 2 &&
        !isLoading &&
        !isStreaming && (
          <div
            className="
              px-6
              py-4
              border-t
              dark:border-gray-700
            "
          >
            <p
              className="
                text-sm
                text-gray-500
                mb-3
              "
            >
              Quick questions:
            </p>

            <div
              className="
                flex
                flex-wrap
                gap-2
              "
            >
              {quickActions.map(
                (action) => (
                  <button
                    key={
                      action.label
                    }

                    onClick={() =>
                      setInput(
                        action.query
                      )
                    }

                    className="
                      text-sm
                      px-4
                      py-2
                      rounded-full
                      border
                      border-green-200
                      text-green-600
                      hover:bg-green-50
                      dark:border-green-800
                      dark:hover:bg-green-900/20
                    "
                  >
                    {action.label}
                  </button>
                )
              )}
            </div>
          </div>
        )}

      {/* INPUT */}

      <div
        className="
          p-6
          border-t
          dark:border-gray-700
        "
      >
        <div
          className="
            flex
            gap-3
          "
        >
          <input
            value={input}

            onChange={(e) =>
              setInput(
                e.target.value
              )
            }

            onKeyDown={
              handleKeyDown
            }

            disabled={
              isLoading ||
              isStreaming ||
              !chatLoaded
            }

            placeholder={
              isStreaming
                ? "NixBot is responding..."
                : "Ask me anything about organ donation..."
            }

            className="
              flex-1
              px-4
              py-3
              rounded-xl
              border
              dark:border-gray-600
              dark:bg-gray-900
              focus:outline-none
              focus:ring-2
              focus:ring-green-500
            "
          />

          {isLoading ||
          isStreaming ? (
            <button
              onClick={
                handleStop
              }

              className="
                px-5
                py-3
                bg-gray-800
                text-white
                rounded-xl
                flex
                gap-2
                items-center
              "
            >
              <Square
                size={17}
                fill="currentColor"
              />

              Stop
            </button>
          ) : (
            <button
              onClick={
                handleSend
              }

              disabled={
                !input.trim()
              }

              className="
                px-6
                py-3
                bg-green-500
                hover:bg-green-600
                text-white
                rounded-xl
                flex
                gap-2
                items-center
                disabled:opacity-50
              "
            >
              <Send size={20} />

              Send
            </button>
          )}
        </div>

        <p
          className="
            text-xs
            text-gray-400
            text-center
            mt-3
          "
        >
          🤖 Powered by NixBot • Saves lives through information
        </p>
      </div>
    </div>
  );
};

export default ODMSChatbot;