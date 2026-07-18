// ------------------------------------------------------------
// src/components/ChatSystem.jsx
// ODMS WhatsApp-Style Real-Time Chat System
// Light + Dark Mode
// Smooth Animations
// Delete for Me + Delete for Everyone
// ------------------------------------------------------------

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";

import {
  Archive,
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronDown,
  Inbox,
  MessageCircle,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Send,
  Settings,
  Smile,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";

import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

// ============================================================
// HELPERS
// ============================================================

const getTimestampMillis = (timestamp) => {
  if (!timestamp) return 0;

  try {
    if (typeof timestamp.toMillis === "function") {
      return timestamp.toMillis();
    }

    if (typeof timestamp.toDate === "function") {
      return timestamp.toDate().getTime();
    }

    if (timestamp.seconds) {
      return timestamp.seconds * 1000;
    }

    if (typeof timestamp === "number") {
      return timestamp;
    }

    const parsed = new Date(timestamp).getTime();

    return Number.isNaN(parsed) ? 0 : parsed;
  } catch {
    return 0;
  }
};

const getDateFromTimestamp = (timestamp) => {
  const millis = getTimestampMillis(timestamp);

  if (!millis) return null;

  const date = new Date(millis);

  return Number.isNaN(date.getTime()) ? null : date;
};

// ============================================================
// COMPONENT
// ============================================================

const ChatSystem = () => {
  const { user } = useAuth();

  // ==========================================================
  // UI STATE
  // ==========================================================

  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");

  // Message menu / delete states
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deletingMessage, setDeletingMessage] = useState(false);

  // ==========================================================
  // DATA STATE
  // ==========================================================

  const [currentUserData, setCurrentUserData] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState("");

  const [allUsers, setAllUsers] = useState([]);
  const [allowedUsers, setAllowedUsers] = useState([]);
  const [matches, setMatches] = useState([]);

  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [unreadCount, setUnreadCount] = useState(0);

  // ==========================================================
  // REFS
  // ==========================================================

  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  // ==========================================================
  // MOBILE DETECTION
  // ==========================================================

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // ==========================================================
  // CLOSE MESSAGE MENU WHEN CLICKING OUTSIDE
  // ==========================================================

  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMessageMenu(null);
    };

    if (activeMessageMenu) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [activeMessageMenu]);

  // ==========================================================
  // LOAD CURRENT USER
  // ==========================================================

  useEffect(() => {
    if (!user?.uid) return;

    const loadCurrentUser = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const snapshot = await getDoc(userRef);

        if (snapshot.exists()) {
          const data = snapshot.data();

          setCurrentUserData({
            id: snapshot.id,
            ...data,
          });

          setCurrentUserRole(data.role || "user");
        } else {
          setCurrentUserData({
            id: user.uid,
            name: user.displayName || user.email || "User",
            email: user.email || "",
            role: "user",
          });

          setCurrentUserRole("user");
        }
      } catch (error) {
        console.error("Error loading current user:", error);
      }
    };

    loadCurrentUser();
  }, [user]);

  // ==========================================================
  // LOAD ALL USERS
  // ==========================================================

  useEffect(() => {
    if (!user?.uid) return;

    const loadUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, "users"));

        const loadedUsers = snapshot.docs
          .map((userDoc) => ({
            id: userDoc.id,
            ...userDoc.data(),
          }))
          .filter((profile) => profile.id !== user.uid);

        setAllUsers(loadedUsers);
      } catch (error) {
        console.error("Error loading users:", error);
      }
    };

    loadUsers();
  }, [user]);

  // ==========================================================
  // LOAD MATCHES
  // ==========================================================

  useEffect(() => {
    if (!user?.uid || !currentUserRole) return;

    if (!["donor", "recipient"].includes(currentUserRole)) {
      setMatches([]);
      return;
    }

    const field =
      currentUserRole === "donor"
        ? "donorId"
        : "recipientId";

    const matchesQuery = query(
      collection(db, "matches"),
      where(field, "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      matchesQuery,
      (snapshot) => {
        const loadedMatches = snapshot.docs.map((matchDoc) => ({
          id: matchDoc.id,
          ...matchDoc.data(),
        }));

        setMatches(loadedMatches);
      },
      (error) => {
        console.error("Error loading matches:", error);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, currentUserRole]);

  // ==========================================================
  // CALCULATE ALLOWED USERS
  // ==========================================================

  useEffect(() => {
    if (!user?.uid || !currentUserRole) return;

    let allowed = [];

    if (["admin", "doctor"].includes(currentUserRole)) {
      allowed = allUsers;
    } else if (currentUserRole === "donor") {
      const recipientIds = matches
        .map((match) => match.recipientId)
        .filter(Boolean);

      allowed = allUsers.filter(
        (otherUser) =>
          ["admin", "doctor"].includes(otherUser.role) ||
          recipientIds.includes(otherUser.id)
      );
    } else if (currentUserRole === "recipient") {
      const donorIds = matches
        .map((match) => match.donorId)
        .filter(Boolean);

      allowed = allUsers.filter(
        (otherUser) =>
          ["admin", "doctor"].includes(otherUser.role) ||
          donorIds.includes(otherUser.id)
      );
    } else {
      allowed = allUsers;
    }

    setAllowedUsers(allowed);
  }, [
    user?.uid,
    currentUserRole,
    allUsers,
    matches,
  ]);

  // ==========================================================
  // LOAD CONVERSATIONS
  // ==========================================================

  useEffect(() => {
    if (!user?.uid) return;

    const conversationsQuery = query(
      collection(db, "conversations"),
      where("participants", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(
      conversationsQuery,
      (snapshot) => {
        const loadedConversations = snapshot.docs.map(
          (conversationDoc) => ({
            id: conversationDoc.id,
            ...conversationDoc.data(),
          })
        );

        loadedConversations.sort((a, b) => {
          const timeA =
            getTimestampMillis(a.lastMessageTime) ||
            getTimestampMillis(a.createdAt);

          const timeB =
            getTimestampMillis(b.lastMessageTime) ||
            getTimestampMillis(b.createdAt);

          return timeB - timeA;
        });

        setConversations(loadedConversations);

        const totalUnread = loadedConversations.reduce(
          (total, conversation) =>
            total + (conversation.unreadCount?.[user.uid] || 0),
          0
        );

        setUnreadCount(totalUnread);

        setSelectedChat((currentSelectedChat) => {
          if (!currentSelectedChat) return null;

          return (
            loadedConversations.find(
              (conversation) =>
                conversation.id === currentSelectedChat.id
            ) || currentSelectedChat
          );
        });
      },
      (error) => {
        console.error("Error loading conversations:", error);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // ==========================================================
  // MARK CONVERSATION READ
  // ==========================================================

  const markConversationAsRead = useCallback(
    async (conversationId) => {
      if (!user?.uid || !conversationId) return;

      try {
        await updateDoc(
          doc(db, "conversations", conversationId),
          {
            [`unreadCount.${user.uid}`]: 0,
          }
        );

        const messagesQuery = query(
          collection(db, "messages"),
          where("conversationId", "==", conversationId)
        );

        const snapshot = await getDocs(messagesQuery);

        const updates = snapshot.docs
          .filter((messageDoc) => {
            const data = messageDoc.data();

            return (
              data.senderId !== user.uid &&
              data.read !== true
            );
          })
          .map((messageDoc) =>
            updateDoc(
              doc(db, "messages", messageDoc.id),
              { read: true }
            )
          );

        await Promise.all(updates);
      } catch (error) {
        console.error(
          "Error marking conversation as read:",
          error
        );
      }
    },
    [user?.uid]
  );

  // ==========================================================
  // LOAD SELECTED CHAT MESSAGES
  // ==========================================================

  useEffect(() => {
    if (!user?.uid || !selectedChat?.id) {
      setMessages([]);
      setMessagesLoading(false);
      return;
    }

    setMessagesLoading(true);

    const messagesQuery = query(
      collection(db, "messages"),
      where("conversationId", "==", selectedChat.id)
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const loadedMessages = snapshot.docs
          .map((messageDoc) => ({
            id: messageDoc.id,
            ...messageDoc.data(),
          }))
          .filter(
            (message) =>
              !message.deletedFor?.includes(user.uid)
          );

        loadedMessages.sort(
          (a, b) =>
            getTimestampMillis(a.timestamp) -
            getTimestampMillis(b.timestamp)
        );

        setMessages(loadedMessages);
        setMessagesLoading(false);

        markConversationAsRead(selectedChat.id);
      },
      (error) => {
        console.error("Error loading messages:", error);

        setMessages([]);
        setMessagesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [
    selectedChat?.id,
    user?.uid,
    markConversationAsRead,
  ]);

  // ==========================================================
  // SCROLL MESSAGE AREA
  // ==========================================================

  useEffect(() => {
    if (messagesLoading || messages.length === 0) return;

    const timer = setTimeout(() => {
      const container = messagesContainerRef.current;

      if (!container) return;

      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [
    messages.length,
    messagesLoading,
    selectedChat?.id,
  ]);

  // ==========================================================
  // USER HELPERS
  // ==========================================================

  const getUserName = (profile) => {
    if (!profile) return "User";

    return (
      profile.fullName ||
      profile.name ||
      profile.displayName ||
      profile.email ||
      "User"
    );
  };

  const getInitial = (name) =>
    name?.trim()?.charAt(0)?.toUpperCase() || "U";

  const getOtherUser = (conversation) => {
    if (!conversation || !user?.uid) {
      return {
        id: "",
        name: "Unknown User",
        role: "user",
      };
    }

    const otherUserId = conversation.participants?.find(
      (participantId) => participantId !== user.uid
    );

    const details =
      conversation.participantDetails?.[otherUserId] || {};

    const liveUser = allUsers.find(
      (profile) => profile.id === otherUserId
    );

    return {
      id: otherUserId,

      name:
        details.name ||
        getUserName(liveUser) ||
        "Unknown User",

      role:
        details.role ||
        liveUser?.role ||
        "user",

      email:
        details.email ||
        liveUser?.email ||
        "",

      photoURL:
        details.photoURL ||
        liveUser?.photoURL ||
        liveUser?.profileImage ||
        "",
    };
  };

  // ==========================================================
  // START CONVERSATION
  // ==========================================================

  const startConversation = async (otherUser) => {
    if (!user?.uid || !otherUser?.id) return;

    try {
      const existingConversation = conversations.find(
        (conversation) =>
          conversation.participants?.includes(user.uid) &&
          conversation.participants?.includes(otherUser.id)
      );

      if (existingConversation) {
        setSelectedChat(existingConversation);
        setSearchQuery("");
        setMobileShowChat(true);
        return;
      }

      const currentName =
        getUserName(currentUserData) ||
        user.displayName ||
        user.email ||
        "User";

      const otherName = getUserName(otherUser);

      const conversationData = {
        participants: [
          user.uid,
          otherUser.id,
        ],

        participantDetails: {
          [user.uid]: {
            name: currentName,
            email:
              user.email ||
              currentUserData?.email ||
              "",
            role:
              currentUserRole ||
              "user",
          },

          [otherUser.id]: {
            name: otherName,
            email:
              otherUser.email ||
              "",
            role:
              otherUser.role ||
              "user",
          },
        },

        lastMessage: "",
        lastMessageTime: serverTimestamp(),
        lastSenderId: "",

        unreadCount: {
          [user.uid]: 0,
          [otherUser.id]: 0,
        },

        createdAt: serverTimestamp(),
      };

      const documentReference = await addDoc(
        collection(db, "conversations"),
        conversationData
      );

      setSelectedChat({
        id: documentReference.id,
        ...conversationData,
      });

      setSearchQuery("");
      setMobileShowChat(true);
    } catch (error) {
      console.error("Error starting conversation:", error);

      alert("Unable to start conversation.");
    }
  };

  // ==========================================================
  // SEND MESSAGE
  // ==========================================================

  const sendMessage = async () => {
    const text = newMessage.trim();

    if (!text || !user?.uid || !selectedChat?.id) return;

    const messageText = text;

    setNewMessage("");

    try {
      await addDoc(
        collection(db, "messages"),
        {
          conversationId: selectedChat.id,
          senderId: user.uid,

          senderName:
            getUserName(currentUserData) ||
            user.displayName ||
            user.email ||
            "User",

          text: messageText,
          timestamp: serverTimestamp(),
          read: false,
          type: "text",

          // Delete system
          deletedFor: [],
          deletedForEveryone: false,
        }
      );

      const otherUserId =
        selectedChat.participants?.find(
          (participantId) =>
            participantId !== user.uid
        );

      const conversationUpdate = {
        lastMessage: messageText,
        lastMessageTime: serverTimestamp(),
        lastSenderId: user.uid,
        [`unreadCount.${user.uid}`]: 0,
      };

      if (otherUserId) {
        const currentUnread =
          selectedChat.unreadCount?.[otherUserId] || 0;

        conversationUpdate[
          `unreadCount.${otherUserId}`
        ] = currentUnread + 1;
      }

      await updateDoc(
        doc(
          db,
          "conversations",
          selectedChat.id
        ),
        conversationUpdate
      );

      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } catch (error) {
      console.error("Error sending message:", error);

      setNewMessage(messageText);

      alert(
        "Message could not be sent. Please check your Firestore permissions."
      );
    }
  };

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  };

  // ==========================================================
  // DELETE MESSAGE
  // ==========================================================

  const openDeleteModal = (message) => {
    setActiveMessageMenu(null);
    setDeleteModal(message);
  };

  const closeDeleteModal = () => {
    if (deletingMessage) return;

    setDeleteModal(null);
  };

  // DELETE ONLY FOR CURRENT USER

  const deleteForMe = async () => {
    if (
      !deleteModal?.id ||
      !user?.uid ||
      deletingMessage
    ) {
      return;
    }

    setDeletingMessage(true);

    try {
      await updateDoc(
        doc(db, "messages", deleteModal.id),
        {
          deletedFor: arrayUnion(user.uid),
        }
      );

      setDeleteModal(null);
    } catch (error) {
      console.error(
        "Error deleting message for current user:",
        error
      );

      alert(
        "Unable to delete this message. Please check your Firestore permissions."
      );
    } finally {
      setDeletingMessage(false);
    }
  };

  // DELETE FOR EVERYONE

  const deleteForEveryone = async () => {
    if (
      !deleteModal?.id ||
      !user?.uid ||
      deletingMessage
    ) {
      return;
    }

    if (deleteModal.senderId !== user.uid) {
      return;
    }

    setDeletingMessage(true);

    try {
      const messageRef = doc(
        db,
        "messages",
        deleteModal.id
      );

      await updateDoc(messageRef, {
        text: "",
        deletedForEveryone: true,
        deletedAt: serverTimestamp(),
      });

      // If deleted message was the latest message,
      // update conversation preview.

      const visibleMessages = messages.filter(
        (message) =>
          message.id !== deleteModal.id &&
          !message.deletedForEveryone
      );

      const latestMessage =
        visibleMessages.length > 0
          ? visibleMessages[
              visibleMessages.length - 1
            ]
          : null;

      const isLatestMessage =
        messages[messages.length - 1]?.id ===
        deleteModal.id;

      if (isLatestMessage && selectedChat?.id) {
        await updateDoc(
          doc(
            db,
            "conversations",
            selectedChat.id
          ),
          {
            lastMessage: latestMessage
              ? latestMessage.text
              : "This message was deleted",

            lastMessageTime:
              latestMessage?.timestamp ||
              serverTimestamp(),

            lastSenderId:
              latestMessage?.senderId || "",
          }
        );
      }

      setDeleteModal(null);
    } catch (error) {
      console.error(
        "Error deleting message for everyone:",
        error
      );

      alert(
        "Unable to delete this message for everyone. Please check your Firestore permissions."
      );
    } finally {
      setDeletingMessage(false);
    }
  };

  // ==========================================================
  // DATE / TIME
  // ==========================================================

  const formatTime = (timestamp) => {
    const date = getDateFromTimestamp(timestamp);

    if (!date) return "";

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatConversationTime = (timestamp) => {
    const date = getDateFromTimestamp(timestamp);

    if (!date) return "";

    const today = new Date();

    if (date.toDateString() === today.toDateString()) {
      return formatTime(timestamp);
    }

    const yesterday = new Date();

    yesterday.setDate(today.getDate() - 1);

    if (
      date.toDateString() ===
      yesterday.toDateString()
    ) {
      return "Yesterday";
    }

    return date.toLocaleDateString([], {
      day: "2-digit",
      month: "short",
    });
  };

  const formatDateDivider = (timestamp) => {
    const date = getDateFromTimestamp(timestamp);

    if (!date) return "";

    const today = new Date();

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }

    const yesterday = new Date();

    yesterday.setDate(today.getDate() - 1);

    if (
      date.toDateString() ===
      yesterday.toDateString()
    ) {
      return "Yesterday";
    }

    return date.toLocaleDateString([], {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const shouldShowDateDivider = (
    message,
    previousMessage
  ) => {
    if (!message?.timestamp) return false;

    if (!previousMessage?.timestamp) return true;

    const currentDate =
      getDateFromTimestamp(message.timestamp);

    const previousDate =
      getDateFromTimestamp(previousMessage.timestamp);

    if (!currentDate || !previousDate) return false;

    return (
      currentDate.toDateString() !==
      previousDate.toDateString()
    );
  };

  // ==========================================================
  // SEARCH
  // ==========================================================

  const searchedUsers = useMemo(() => {
    const value =
      searchQuery.trim().toLowerCase();

    if (!value) return [];

    return allowedUsers.filter((profile) => {
      const name =
        getUserName(profile).toLowerCase();

      const email =
        (profile.email || "").toLowerCase();

      return (
        name.includes(value) ||
        email.includes(value)
      );
    });
  }, [
    allowedUsers,
    searchQuery,
  ]);

  // ==========================================================
  // FILTER CONVERSATIONS
  // ==========================================================

  const filteredConversations = useMemo(() => {
    const value =
      searchQuery.trim().toLowerCase();

    return conversations.filter(
      (conversation) => {
        const otherUser =
          getOtherUser(conversation);

        const matchesSearch =
          !value ||
          otherUser.name
            ?.toLowerCase()
            .includes(value) ||
          otherUser.email
            ?.toLowerCase()
            .includes(value) ||
          conversation.lastMessage
            ?.toLowerCase()
            .includes(value);

        if (!matchesSearch) return false;

        const unread =
          conversation.unreadCount?.[user?.uid] || 0;

        if (activeFilter === "unread") {
          return unread > 0;
        }

        return true;
      }
    );
  }, [
    conversations,
    searchQuery,
    activeFilter,
    user?.uid,
    allUsers,
  ]);

  // ==========================================================
  // AVATAR
  // ==========================================================

  const Avatar = ({
    profile,
    size = "w-12 h-12",
    textSize = "text-base",
  }) => {
    const name =
      profile?.name ||
      getUserName(profile);

    if (profile?.photoURL) {
      return (
        <img
          src={profile.photoURL}
          alt={name}
          className={`
            ${size}
            rounded-full
            object-cover
            flex-shrink-0
            transition-transform
            duration-300
            hover:scale-105
          `}
        />
      );
    }

    return (
      <div
        className={`
          ${size}
          ${textSize}
          rounded-full
          flex-shrink-0
          flex
          items-center
          justify-center
          font-semibold
          bg-[#d9fdd3]
          dark:bg-[#005c4b]
          text-[#008069]
          dark:text-[#d9fdd3]
          border
          border-[#b7efca]
          dark:border-[#007c69]
          transition-all
          duration-300
        `}
      >
        {getInitial(name)}
      </div>
    );
  };

  if (!user) return null;

  // ==========================================================
  // FLOATING BUTTON
  // ==========================================================

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Open ODMS Chat"
        className="
          odms-floating-button
          fixed
          right-5
          bottom-5
          z-[9999]
          w-14
          h-14
          rounded-full
          flex
          items-center
          justify-center
          text-white
          bg-[#25d366]
          hover:bg-[#20bd5a]
          dark:bg-[#00a884]
          dark:hover:bg-[#008f72]
          shadow-xl
          hover:scale-110
          active:scale-90
          transition-all
          duration-300
        "
      >
        <MessageCircle size={26} />

        {unreadCount > 0 && (
          <span className="
            absolute
            -top-1
            -right-1
            min-w-5
            h-5
            px-1
            rounded-full
            bg-red-500
            text-white
            text-[10px]
            font-bold
            flex
            items-center
            justify-center
            border-2
            border-white
            dark:border-[#111b21]
            animate-bounce
          ">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>
    );
  }

  // ==========================================================
  // MAIN UI
  // ==========================================================

  return (
    <>
      <style>{`

        /* =====================================================
           CHAT OPEN ANIMATION
        ===================================================== */

        @keyframes odmsChatOpen {
          from {
            opacity: 0;
            transform: scale(0.985);
          }

          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* =====================================================
           MESSAGE ENTER ANIMATION
        ===================================================== */

        @keyframes odmsMessageEnter {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.97);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* =====================================================
           MENU ANIMATION
        ===================================================== */

        @keyframes odmsMenuEnter {
          from {
            opacity: 0;
            transform: translateY(-5px) scale(0.95);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* =====================================================
           MODAL ANIMATION
        ===================================================== */

        @keyframes odmsModalEnter {
          from {
            opacity: 0;
            transform: scale(0.92) translateY(10px);
          }

          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .odms-chat-root {
          animation: odmsChatOpen 0.25s ease-out;
        }

        .odms-message-enter {
          animation: odmsMessageEnter 0.25s ease-out both;
        }

        .odms-message-menu {
          animation: odmsMenuEnter 0.15s ease-out;
        }

        .odms-delete-modal {
          animation: odmsModalEnter 0.2s ease-out;
        }

        /* =====================================================
           SCROLLBAR
        ===================================================== */

        .odms-chat-scrollbar {
          scrollbar-width: thin;
          scrollbar-color:
            rgba(11, 20, 26, 0.25)
            transparent;
        }

        .dark .odms-chat-scrollbar {
          scrollbar-color:
            rgba(134, 150, 160, 0.35)
            transparent;
        }

        .odms-chat-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .odms-chat-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .odms-chat-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(11, 20, 26, 0.25);
          border-radius: 999px;
        }

        .dark
        .odms-chat-scrollbar::-webkit-scrollbar-thumb {
          background:
            rgba(134, 150, 160, 0.35);
        }

        /* =====================================================
           MESSAGE MENU VISIBILITY
        ===================================================== */

        .odms-message-menu-button {
          opacity: 0;
          transform: translateY(-3px);
          transition:
            opacity 0.15s ease,
            transform 0.15s ease;
        }

        .odms-message-bubble:hover
        .odms-message-menu-button {
          opacity: 1;
          transform: translateY(0);
        }

        @media (max-width: 767px) {
          .odms-message-menu-button {
            opacity: 1;
          }
        }

        /* =====================================================
           REDUCED MOTION
        ===================================================== */

        @media (
          prefers-reduced-motion: reduce
        ) {
          .odms-chat-root,
          .odms-message-enter,
          .odms-message-menu,
          .odms-delete-modal {
            animation: none !important;
          }
        }
      `}</style>

      <div
        className="
          odms-chat-root
          fixed
          inset-0
          z-[9999]
          h-[100dvh]
          max-h-[100dvh]
          flex
          overflow-hidden
          bg-[#f0f2f5]
          dark:bg-[#0b141a]
          text-[#111b21]
          dark:text-[#e9edef]
        "
      >
        {/* ====================================================
            MINI LEFT NAVIGATION
        ==================================================== */}

        {!isMobile && (
          <aside
            className="
              w-[64px]
              h-full
              flex-shrink-0
              bg-[#f7f8fa]
              dark:bg-[#111b21]
              border-r
              border-[#e9edef]
              dark:border-[#222d34]
              flex
              flex-col
              items-center
              justify-between
              py-3
            "
          >
            <div className="flex flex-col items-center gap-3">

              <button
                type="button"
                className="
                  w-10
                  h-10
                  rounded-full
                  flex
                  items-center
                  justify-center
                  bg-[#e9edef]
                  dark:bg-[#202c33]
                  text-[#54656f]
                  dark:text-[#aebac1]
                  transition-all
                  duration-200
                  hover:scale-105
                "
              >
                <Inbox size={20} />
              </button>

              <button
                type="button"
                className="
                  w-10 h-10 rounded-full
                  flex items-center justify-center
                  text-[#54656f]
                  dark:text-[#8696a0]
                  hover:bg-[#e9edef]
                  dark:hover:bg-[#202c33]
                  transition-all
                  duration-200
                "
              >
                <Phone size={19} />
              </button>

              <button
                type="button"
                className="
                  relative
                  w-10 h-10 rounded-full
                  flex items-center justify-center
                  text-[#008069]
                  dark:text-[#00a884]
                  bg-[#d9fdd3]
                  dark:bg-[#005c4b]
                  transition-all
                  duration-200
                  hover:scale-105
                "
              >
                <MessageCircle size={20} />

                {unreadCount > 0 && (
                  <span className="
                    absolute
                    top-0
                    right-0
                    min-w-4
                    h-4
                    px-1
                    bg-[#25d366]
                    dark:bg-[#00a884]
                    text-white
                    text-[9px]
                    rounded-full
                    flex
                    items-center
                    justify-center
                  ">
                    {unreadCount > 9
                      ? "9+"
                      : unreadCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                className="
                  w-10 h-10 rounded-full
                  flex items-center justify-center
                  text-[#54656f]
                  dark:text-[#8696a0]
                  hover:bg-[#e9edef]
                  dark:hover:bg-[#202c33]
                  transition-all
                "
              >
                <Users size={20} />
              </button>

              <button
                type="button"
                className="
                  w-10 h-10 rounded-full
                  flex items-center justify-center
                  text-[#54656f]
                  dark:text-[#8696a0]
                  hover:bg-[#e9edef]
                  dark:hover:bg-[#202c33]
                  transition-all
                "
              >
                <Archive size={19} />
              </button>

            </div>

            <div className="flex flex-col items-center gap-4">

              <button
                type="button"
                className="
                  w-10 h-10 rounded-full
                  flex items-center justify-center
                  text-[#54656f]
                  dark:text-[#8696a0]
                  hover:bg-[#e9edef]
                  dark:hover:bg-[#202c33]
                  transition-all
                "
              >
                <Settings size={20} />
              </button>

              <Avatar
                profile={{
                  name:
                    getUserName(currentUserData) ||
                    user.email,
                  photoURL: user.photoURL,
                }}
                size="w-9 h-9"
                textSize="text-sm"
              />

            </div>
          </aside>
        )}

        {/* ====================================================
            CHAT LIST
        ==================================================== */}

        <aside
          className={`
            ${
              isMobile
                ? mobileShowChat
                  ? "hidden"
                  : "flex w-full"
                : "flex w-[380px]"
            }
            h-full
            flex-shrink-0
            flex-col
            bg-white
            dark:bg-[#111b21]
            border-r
            border-[#e9edef]
            dark:border-[#222d34]
          `}
        >

          {/* CHAT LIST HEADER */}

          <div
            className="
              flex-shrink-0
              px-5
              pt-4
              pb-3
              bg-white
              dark:bg-[#111b21]
            "
          >

            <div className="flex items-center justify-between">

              <h1
                className="
                  text-[24px]
                  font-semibold
                  text-[#111b21]
                  dark:text-[#e9edef]
                "
              >
                Chats
              </h1>

              <div className="flex items-center gap-1">

                <button
                  type="button"
                  className="
                    w-9 h-9
                    flex items-center justify-center
                    rounded-full
                    text-[#54656f]
                    dark:text-[#aebac1]
                    hover:bg-[#f0f2f5]
                    dark:hover:bg-[#202c33]
                    transition-all
                    duration-200
                    active:scale-90
                  "
                >
                  <Plus size={21} />
                </button>

                <button
                  type="button"
                  className="
                    w-9 h-9
                    flex items-center justify-center
                    rounded-full
                    text-[#54656f]
                    dark:text-[#aebac1]
                    hover:bg-[#f0f2f5]
                    dark:hover:bg-[#202c33]
                    transition-all
                    duration-200
                  "
                >
                  <MoreVertical size={20} />
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="
                    w-9 h-9
                    flex items-center justify-center
                    rounded-full
                    text-[#54656f]
                    dark:text-[#aebac1]
                    hover:bg-red-50
                    dark:hover:bg-[#202c33]
                    hover:text-red-500
                    transition-all
                    duration-200
                    active:scale-90
                  "
                >
                  <X size={20} />
                </button>

              </div>
            </div>

            {/* SEARCH */}

            <div className="relative mt-4">

              <Search
                size={18}
                className="
                  absolute
                  left-4
                  top-1/2
                  -translate-y-1/2
                  text-[#667781]
                  dark:text-[#8696a0]
                "
              />

              <input
                type="text"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
                placeholder="Search or start a new chat"
                className="
                  w-full
                  h-10
                  pl-11
                  pr-10
                  rounded-lg
                  border-0
                  bg-[#f0f2f5]
                  dark:bg-[#202c33]
                  text-[#111b21]
                  dark:text-[#e9edef]
                  placeholder:text-[#667781]
                  dark:placeholder:text-[#8696a0]
                  text-sm
                  outline-none
                  focus:ring-1
                  focus:ring-[#00a884]
                  transition-all
                  duration-200
                "
              />

            </div>

            {/* FILTERS */}

            <div className="
              flex
              items-center
              gap-2
              mt-3
              overflow-x-auto
            ">

              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`
                  px-4 py-1.5
                  rounded-full
                  border
                  text-sm
                  whitespace-nowrap
                  transition-all
                  duration-200
                  active:scale-95
                  ${
                    activeFilter === "all"
                      ? `
                        bg-[#d9fdd3]
                        dark:bg-[#005c4b]
                        text-[#008069]
                        dark:text-[#e9edef]
                        border-[#b7efca]
                        dark:border-[#008069]
                      `
                      : `
                        bg-white
                        dark:bg-[#111b21]
                        border-[#d1d7db]
                        dark:border-[#667781]
                        text-[#111b21]
                        dark:text-[#e9edef]
                        hover:bg-[#f5f6f6]
                        dark:hover:bg-[#202c33]
                      `
                  }
                `}
              >
                All
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter("unread")}
                className={`
                  px-4 py-1.5
                  rounded-full
                  border
                  text-sm
                  whitespace-nowrap
                  transition-all
                  duration-200
                  active:scale-95
                  ${
                    activeFilter === "unread"
                      ? `
                        bg-[#d9fdd3]
                        dark:bg-[#005c4b]
                        text-[#008069]
                        dark:text-[#e9edef]
                        border-[#b7efca]
                        dark:border-[#008069]
                      `
                      : `
                        bg-white
                        dark:bg-[#111b21]
                        border-[#d1d7db]
                        dark:border-[#667781]
                        text-[#111b21]
                        dark:text-[#e9edef]
                        hover:bg-[#f5f6f6]
                        dark:hover:bg-[#202c33]
                      `
                  }
                `}
              >
                Unread
              </button>

              <button
                type="button"
                className="
                  px-4 py-1.5
                  rounded-full
                  border
                  border-[#d1d7db]
                  dark:border-[#667781]
                  bg-white
                  dark:bg-[#111b21]
                  text-[#111b21]
                  dark:text-[#e9edef]
                  text-sm
                  whitespace-nowrap
                  hover:bg-[#f5f6f6]
                  dark:hover:bg-[#202c33]
                  transition-all
                "
              >
                Favourites
              </button>

              <button
                type="button"
                className="
                  w-9 h-9
                  flex-shrink-0
                  rounded-full
                  border
                  border-[#d1d7db]
                  dark:border-[#667781]
                  bg-white
                  dark:bg-[#111b21]
                  text-[#54656f]
                  dark:text-[#aebac1]
                  flex
                  items-center
                  justify-center
                  hover:bg-[#f5f6f6]
                  dark:hover:bg-[#202c33]
                  transition-all
                "
              >
                <ChevronDown size={16} />
              </button>

            </div>
          </div>

          {/* SEARCH USERS */}

          {searchQuery.trim() &&
            searchedUsers.length > 0 && (

              <div
                className="
                  border-y
                  border-[#e9edef]
                  dark:border-[#222d34]
                  bg-white
                  dark:bg-[#111b21]
                "
              >

                <p
                  className="
                    px-5
                    py-2
                    text-xs
                    font-medium
                    text-[#008069]
                    dark:text-[#00a884]
                  "
                >
                  START NEW CHAT
                </p>

                {searchedUsers
                  .slice(0, 5)
                  .map((profile) => (

                    <button
                      key={profile.id}
                      type="button"
                      onClick={() =>
                        startConversation(profile)
                      }
                      className="
                        w-full
                        flex
                        items-center
                        gap-3
                        px-5
                        py-3
                        bg-white
                        dark:bg-[#111b21]
                        hover:bg-[#f5f6f6]
                        dark:hover:bg-[#202c33]
                        text-[#111b21]
                        dark:text-[#e9edef]
                        text-left
                        transition-all
                        duration-200
                      "
                    >

                      <Avatar
                        profile={{
                          ...profile,
                          name:
                            getUserName(profile),
                        }}
                      />

                      <div>

                        <p className="font-medium">
                          {getUserName(profile)}
                        </p>

                        <p
                          className="
                            text-xs
                            text-[#667781]
                            dark:text-[#8696a0]
                            capitalize
                          "
                        >
                          {profile.role || "User"}
                        </p>

                      </div>

                    </button>

                  ))}

              </div>

            )}

          {/* CONVERSATION LIST */}

          <div
            className="
              odms-chat-scrollbar
              flex-1
              min-h-0
              overflow-y-auto
              overscroll-contain
              bg-white
              dark:bg-[#111b21]
            "
          >

            {filteredConversations.map(
              (conversation) => {

                const otherUser =
                  getOtherUser(conversation);

                const unread =
                  conversation.unreadCount?.[
                    user.uid
                  ] || 0;

                const selected =
                  selectedChat?.id ===
                  conversation.id;

                return (

                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => {
                      setSelectedChat(conversation);
                      setMobileShowChat(true);
                    }}
                    className={`
                      w-full
                      flex
                      items-center
                      gap-3
                      px-5
                      py-3
                      text-left
                      transition-all
                      duration-200
                      ${
                        selected
                          ? `
                            bg-[#f0f2f5]
                            dark:bg-[#2a3942]
                          `
                          : `
                            bg-white
                            dark:bg-[#111b21]
                            hover:bg-[#f5f6f6]
                            dark:hover:bg-[#202c33]
                          `
                      }
                    `}
                  >

                    <Avatar profile={otherUser} />

                    <div
                      className="
                        flex-1
                        min-w-0
                        border-b
                        border-[#e9edef]
                        dark:border-[#222d34]
                        pb-3
                      "
                    >

                      <div className="
                        flex
                        justify-between
                        gap-2
                      ">

                        <p
                          className="
                            font-medium
                            truncate
                            text-[#111b21]
                            dark:text-[#e9edef]
                          "
                        >
                          {otherUser.name}
                        </p>

                        <span
                          className={`
                            text-[11px]
                            whitespace-nowrap
                            ${
                              unread > 0
                                ? "text-[#1fa855] dark:text-[#00a884]"
                                : "text-[#667781] dark:text-[#8696a0]"
                            }
                          `}
                        >
                          {formatConversationTime(
                            conversation.lastMessageTime
                          )}
                        </span>

                      </div>

                      <div
                        className="
                          flex
                          justify-between
                          items-center
                          mt-1
                          gap-2
                        "
                      >

                        <p
                          className="
                            text-sm
                            text-[#667781]
                            dark:text-[#8696a0]
                            truncate
                          "
                        >
                          {conversation.lastMessage ||
                            "Start chatting"}
                        </p>

                        {unread > 0 && (

                          <span
                            className="
                              min-w-5
                              h-5
                              px-1
                              flex-shrink-0
                              bg-[#25d366]
                              dark:bg-[#00a884]
                              text-white
                              rounded-full
                              text-[10px]
                              font-semibold
                              flex
                              items-center
                              justify-center
                            "
                          >
                            {unread}
                          </span>

                        )}

                      </div>

                    </div>

                  </button>

                );
              }
            )}

          </div>

        </aside>

        {/* ====================================================
            ACTIVE CHAT
        ==================================================== */}

        <main
          className={`
            ${
              isMobile
                ? mobileShowChat
                  ? "flex w-full"
                  : "hidden"
                : "flex flex-1"
            }
            h-full
            min-w-0
            flex-col
            bg-[#efeae2]
            dark:bg-[#0b141a]
          `}
        >

          {selectedChat ? (

            <>

              {/* CHAT HEADER */}

              <header
                className="
                  h-[64px]
                  flex-shrink-0
                  bg-[#f0f2f5]
                  dark:bg-[#202c33]
                  border-b
                  border-[#e9edef]
                  dark:border-[#222d34]
                  px-4
                  flex
                  items-center
                  justify-between
                  text-[#111b21]
                  dark:text-[#e9edef]
                "
              >

                <div className="
                  flex
                  items-center
                  gap-3
                  min-w-0
                ">

                  {isMobile && (

                    <button
                      type="button"
                      onClick={() =>
                        setMobileShowChat(false)
                      }
                      className="
                        text-[#54656f]
                        dark:text-[#aebac1]
                        transition-transform
                        active:scale-90
                      "
                    >
                      <ArrowLeft size={21} />
                    </button>

                  )}

                  <Avatar
                    profile={getOtherUser(
                      selectedChat
                    )}
                    size="w-10 h-10"
                  />

                  <div className="min-w-0">

                    <h2
                      className="
                        font-medium
                        truncate
                        text-[#111b21]
                        dark:text-[#e9edef]
                      "
                    >
                      {getOtherUser(
                        selectedChat
                      ).name}
                    </h2>

                    <p
                      className="
                        text-xs
                        text-[#667781]
                        dark:text-[#8696a0]
                        capitalize
                      "
                    >
                      {getOtherUser(
                        selectedChat
                      ).role}
                    </p>

                  </div>

                </div>

                <div
                  className="
                    flex
                    items-center
                    gap-1
                    text-[#54656f]
                    dark:text-[#aebac1]
                  "
                >

                  <button
                    type="button"
                    className="
                      w-10 h-10
                      rounded-full
                      flex items-center justify-center
                      hover:bg-black/5
                      dark:hover:bg-white/5
                      transition-all
                      active:scale-90
                    "
                  >
                    <Video size={21} />
                  </button>

                  <button
                    type="button"
                    className="
                      w-10 h-10
                      rounded-full
                      flex items-center justify-center
                      hover:bg-black/5
                      dark:hover:bg-white/5
                      transition-all
                      active:scale-90
                    "
                  >
                    <Phone size={20} />
                  </button>

                  <button
                    type="button"
                    className="
                      hidden sm:flex
                      w-10 h-10
                      rounded-full
                      items-center justify-center
                      hover:bg-black/5
                      dark:hover:bg-white/5
                      transition-all
                    "
                  >
                    <Search size={20} />
                  </button>

                  <button
                    type="button"
                    className="
                      w-10 h-10
                      rounded-full
                      flex items-center justify-center
                      hover:bg-black/5
                      dark:hover:bg-white/5
                      transition-all
                    "
                  >
                    <MoreVertical size={20} />
                  </button>

                </div>

              </header>

              {/* ==================================================
                  MESSAGE AREA
              ================================================== */}

              <div
                ref={messagesContainerRef}
                className="
                  odms-chat-scrollbar
                  flex-1
                  min-h-0
                  overflow-y-auto
                  overflow-x-hidden
                  overscroll-contain
                  px-4
                  sm:px-8
                  lg:px-16
                  py-4
                  bg-[#efeae2]
                  dark:bg-[#0b141a]
                "
                style={{
                  backgroundImage: `
                    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cg fill='none' stroke='%238696a0' stroke-width='1' stroke-opacity='.08'%3E%3Ccircle cx='24' cy='24' r='12'/%3E%3Cpath d='M18 24h12M24 18v12M70 15l5 8 9 1-7 6 2 9-9-5-8 5 2-9-7-6 9-1zM116 18c10 0 18 8 18 18s-8 18-18 18-18-8-18-18 8-18 18-18zM20 83c8-10 20-10 28 0 8 11 2 24-14 35-16-11-22-24-14-35zM78 76c0-8 7-15 15-15s15 7 15 15-7 15-15 15h-6l-10 8 3-11c-2-4-2-8-2-12zM130 78l8 8m-8 0 8-8M25 135l10-15 10 15-10 14zM82 128c6-7 15-7 21 0M79 136c9 8 18 8 27 0M125 122c8 3 13 10 13 18M124 129c4 2 7 6 7 11'/%3E%3C/g%3E%3C/svg%3E")
                  `,
                  backgroundRepeat: "repeat",
                  backgroundSize: "160px 160px",
                }}
              >

                <div
                  className="
                    max-w-[1000px]
                    mx-auto
                    min-h-full
                    flex
                    flex-col
                  "
                >

                  {/* LOADING */}

                  {messagesLoading && (

                    <div className="
                      flex
                      justify-center
                      py-5
                    ">

                      <div
                        className="
                          bg-white/95
                          dark:bg-[#202c33]/95
                          backdrop-blur-sm
                          px-4
                          py-2
                          rounded-lg
                          shadow-sm
                          text-xs
                          text-[#667781]
                          dark:text-[#aebac1]
                          animate-pulse
                        "
                      >
                        Loading messages...
                      </div>

                    </div>

                  )}

                  {/* EMPTY */}

                  {!messagesLoading &&
                    messages.length === 0 && (

                      <div className="
                        flex
                        justify-center
                        pt-5
                      ">

                        <div
                          className="
                            max-w-md
                            px-4
                            py-2.5
                            rounded-lg
                            bg-[#fff4c6]
                            dark:bg-[#182229]
                            shadow-sm
                            text-center
                            text-[12px]
                            leading-5
                            text-[#54656f]
                            dark:text-[#aebac1]
                          "
                        >
                          Messages in this conversation
                          are available only to authorized
                          ODMS users.
                        </div>

                      </div>

                    )}

                  {/* MESSAGES */}

                  <div className="
                    flex
                    flex-col
                    gap-[3px]
                  ">

                    {messages.map(
                      (message, index) => {

                        const isOwn =
                          message.senderId ===
                          user.uid;

                        const previousMessage =
                          index > 0
                            ? messages[index - 1]
                            : null;

                        const nextMessage =
                          index <
                          messages.length - 1
                            ? messages[index + 1]
                            : null;

                        const sameSenderAsPrevious =
                          previousMessage?.senderId ===
                          message.senderId;

                        const sameSenderAsNext =
                          nextMessage?.senderId ===
                          message.senderId;

                        const showDivider =
                          shouldShowDateDivider(
                            message,
                            previousMessage
                          );

                        const isDeleted =
                          message.deletedForEveryone ===
                          true;

                        return (

                          <React.Fragment
                            key={message.id}
                          >

                            {/* DATE DIVIDER */}

                            {showDivider && (

                              <div
                                className="
                                  flex
                                  justify-center
                                  py-3
                                "
                              >

                                <span
                                  className="
                                    bg-white/95
                                    dark:bg-[#182229]/95
                                    backdrop-blur-sm
                                    text-[#54656f]
                                    dark:text-[#aebac1]
                                    text-[11px]
                                    font-medium
                                    px-3
                                    py-1.5
                                    rounded-lg
                                    shadow-sm
                                  "
                                >
                                  {formatDateDivider(
                                    message.timestamp
                                  )}
                                </span>

                              </div>

                            )}

                            {/* MESSAGE ROW */}

                            <div
                              className={`
                                odms-message-enter
                                flex
                                w-full
                                ${
                                  isOwn
                                    ? "justify-end"
                                    : "justify-start"
                                }
                                ${
                                  sameSenderAsPrevious &&
                                  !showDivider
                                    ? "mt-[1px]"
                                    : "mt-1"
                                }
                              `}
                            >

                              {/* MESSAGE BUBBLE */}

                              <div
                                className={`
                                  odms-message-bubble
                                  group
                                  relative
                                  max-w-[85%]
                                  sm:max-w-[70%]
                                  lg:max-w-[65%]
                                  min-w-[70px]
                                  px-[9px]
                                  pt-[6px]
                                  pb-[5px]
                                  shadow-[0_1px_1px_rgba(11,20,26,0.13)]
                                  transition-all
                                  duration-200
                                  hover:shadow-md
                                  ${
                                    isOwn
                                      ? `
                                        bg-[#d9fdd3]
                                        dark:bg-[#005c4b]
                                        text-[#111b21]
                                        dark:text-[#e9edef]
                                        ${
                                          sameSenderAsNext
                                            ? "rounded-lg"
                                            : "rounded-lg rounded-tr-sm"
                                        }
                                      `
                                      : `
                                        bg-white
                                        dark:bg-[#202c33]
                                        text-[#111b21]
                                        dark:text-[#e9edef]
                                        ${
                                          sameSenderAsNext
                                            ? "rounded-lg"
                                            : "rounded-lg rounded-tl-sm"
                                        }
                                      `
                                  }
                                `}
                              >

                                {/* MESSAGE MENU BUTTON */}

                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();

                                    setActiveMessageMenu(
                                      activeMessageMenu ===
                                        message.id
                                        ? null
                                        : message.id
                                    );
                                  }}
                                  className={`
                                    odms-message-menu-button
                                    absolute
                                    top-1
                                    ${
                                      isOwn
                                        ? "right-1"
                                        : "right-1"
                                    }
                                    z-20
                                    w-7
                                    h-7
                                    rounded-full
                                    flex
                                    items-center
                                    justify-center
                                    bg-white/70
                                    dark:bg-[#111b21]/70
                                    backdrop-blur-sm
                                    text-[#54656f]
                                    dark:text-[#aebac1]
                                    hover:bg-white
                                    dark:hover:bg-[#111b21]
                                  `}
                                >
                                  <ChevronDown
                                    size={16}
                                  />
                                </button>

                                {/* DROPDOWN MENU */}

                                {activeMessageMenu ===
                                  message.id && (

                                  <div
                                    onClick={(event) =>
                                      event.stopPropagation()
                                    }
                                    className={`
                                      odms-message-menu
                                      absolute
                                      top-8
                                      z-[100]
                                      w-[180px]
                                      overflow-hidden
                                      rounded-xl
                                      bg-white
                                      dark:bg-[#233138]
                                      shadow-xl
                                      border
                                      border-black/5
                                      dark:border-white/5
                                      ${
                                        isOwn
                                          ? "right-1"
                                          : "left-1"
                                      }
                                    `}
                                  >

                                    <button
                                      type="button"
                                      onClick={() =>
                                        openDeleteModal(
                                          message
                                        )
                                      }
                                      className="
                                        w-full
                                        px-4
                                        py-3
                                        flex
                                        items-center
                                        gap-3
                                        text-sm
                                        text-red-500
                                        hover:bg-[#f5f6f6]
                                        dark:hover:bg-[#182229]
                                        transition-colors
                                      "
                                    >
                                      <Trash2
                                        size={17}
                                      />

                                      Delete message
                                    </button>

                                  </div>

                                )}

                                {/* MESSAGE TEXT */}

                                <div className="
                                  flex
                                  items-end
                                  gap-2
                                ">

                                  {isDeleted ? (

                                    <p
                                      className="
                                        text-[13.5px]
                                        leading-[19px]
                                        italic
                                        text-[#667781]
                                        dark:text-[#aebac1]
                                        pr-4
                                      "
                                    >
                                      🚫 This message was deleted
                                    </p>

                                  ) : (

                                    <p
                                      className="
                                        text-[14px]
                                        sm:text-[14.2px]
                                        leading-[19px]
                                        whitespace-pre-wrap
                                        break-words
                                        min-w-0
                                        pr-5
                                      "
                                    >
                                      {message.text}
                                    </p>

                                  )}

                                  <span className="
                                    inline-block
                                    min-w-[62px]
                                  " />

                                </div>

                                {/* TIME */}

                                <div
                                  className="
                                    absolute
                                    right-[7px]
                                    bottom-[4px]
                                    flex
                                    items-center
                                    gap-[2px]
                                    select-none
                                  "
                                >

                                  <span
                                    className="
                                      text-[10px]
                                      leading-none
                                      text-[#667781]
                                      dark:text-[#8696a0]
                                    "
                                  >
                                    {formatTime(
                                      message.timestamp
                                    )}
                                  </span>

                                  {isOwn &&
                                    (message.read ? (

                                      <CheckCheck
                                        size={14}
                                        strokeWidth={2}
                                        className="
                                          text-[#53bdeb]
                                        "
                                      />

                                    ) : (

                                      <Check
                                        size={14}
                                        strokeWidth={2}
                                        className="
                                          text-[#667781]
                                          dark:text-[#8696a0]
                                        "
                                      />

                                    ))}

                                </div>

                              </div>

                            </div>

                          </React.Fragment>

                        );
                      }
                    )}

                  </div>

                  <div className="h-3" />

                </div>

              </div>

              {/* ==================================================
                  MESSAGE INPUT
              ================================================== */}

              <footer
                className="
                  flex-shrink-0
                  bg-[#f0f2f5]
                  dark:bg-[#202c33]
                  px-3
                  sm:px-4
                  py-2.5
                  border-t
                  border-black/5
                  dark:border-[#222d34]
                "
              >

                <div
                  className="
                    max-w-[1200px]
                    mx-auto
                    flex
                    items-end
                    gap-2
                  "
                >

                  <button
                    type="button"
                    className="
                      w-10
                      h-10
                      flex-shrink-0
                      flex
                      items-center
                      justify-center
                      rounded-full
                      text-[#54656f]
                      dark:text-[#aebac1]
                      hover:bg-black/5
                      dark:hover:bg-white/5
                      transition-all
                      duration-200
                      active:scale-90
                    "
                  >
                    <Plus
                      size={25}
                      strokeWidth={1.8}
                    />
                  </button>

                  <button
                    type="button"
                    className="
                      hidden
                      sm:flex
                      w-10
                      h-10
                      flex-shrink-0
                      items-center
                      justify-center
                      rounded-full
                      text-[#54656f]
                      dark:text-[#aebac1]
                      hover:bg-black/5
                      dark:hover:bg-white/5
                      transition-all
                      duration-200
                      active:scale-90
                    "
                  >
                    <Smile
                      size={23}
                      strokeWidth={1.8}
                    />
                  </button>

                  {/* INPUT */}

                  <div
                    className="
                      flex-1
                      min-w-0
                      bg-white
                      dark:bg-[#2a3942]
                      rounded-xl
                      flex
                      items-center
                      shadow-sm
                      transition-all
                      duration-200
                      focus-within:ring-1
                      focus-within:ring-[#00a884]/50
                    "
                  >

                    <textarea
                      ref={inputRef}
                      rows={1}
                      value={newMessage}
                      onChange={(event) =>
                        setNewMessage(
                          event.target.value
                        )
                      }
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message"
                      className="
                        w-full
                        max-h-28
                        resize-none
                        overflow-y-auto
                        bg-transparent
                        px-4
                        py-3
                        text-[14px]
                        text-[#111b21]
                        dark:text-[#e9edef]
                        placeholder:text-[#667781]
                        dark:placeholder:text-[#8696a0]
                        outline-none
                        border-none
                      "
                    />

                  </div>

                  {/* SEND */}

                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className={`
                      w-10
                      h-10
                      flex-shrink-0
                      flex
                      items-center
                      justify-center
                      rounded-full
                      transition-all
                      duration-300
                      ${
                        newMessage.trim()
                          ? `
                            bg-[#00a884]
                            text-white
                            hover:bg-[#008f72]
                            hover:scale-105
                            active:scale-90
                            shadow-sm
                          `
                          : `
                            bg-transparent
                            text-[#54656f]
                            dark:text-[#8696a0]
                            cursor-default
                          `
                      }
                    `}
                  >

                    <Send
                      size={20}
                      strokeWidth={1.8}
                    />

                  </button>

                </div>

              </footer>

            </>

          ) : (

            /* ==================================================
                NO CONVERSATION SELECTED
            ================================================== */

            <div
              className="
                flex-1
                min-h-0
                flex
                flex-col
                items-center
                justify-center
                bg-[#f7f9fa]
                dark:bg-[#222e35]
                text-[#111b21]
                dark:text-[#e9edef]
                text-center
                border-b-[6px]
                border-[#25d366]
                dark:border-[#00a884]
              "
            >

              <MessageCircle
                size={60}
                className="
                  text-[#25d366]
                  dark:text-[#00a884]
                "
              />

              <h2
                className="
                  text-2xl
                  mt-5
                  text-[#111b21]
                  dark:text-[#e9edef]
                "
              >
                ODMS Chat
              </h2>

              <p
                className="
                  text-[#667781]
                  dark:text-[#8696a0]
                  mt-2
                "
              >
                Select a conversation to start messaging.
              </p>

            </div>

          )}

        </main>

      </div>

      {/* ======================================================
          DELETE MESSAGE MODAL
      ====================================================== */}

      {deleteModal && (

        <div
          onClick={closeDeleteModal}
          className="
            fixed
            inset-0
            z-[10000]
            flex
            items-center
            justify-center
            px-4
            bg-black/50
            backdrop-blur-[2px]
          "
        >

          <div
            onClick={(event) =>
              event.stopPropagation()
            }
            className="
              odms-delete-modal
              w-full
              max-w-[400px]
              overflow-hidden
              rounded-2xl
              bg-white
              dark:bg-[#233138]
              shadow-2xl
              text-[#111b21]
              dark:text-[#e9edef]
            "
          >

            <div className="
              px-6
              pt-6
              pb-4
            ">

              <div className="
                flex
                items-center
                gap-3
              ">

                <div
                  className="
                    w-11
                    h-11
                    rounded-full
                    flex
                    items-center
                    justify-center
                    bg-red-50
                    dark:bg-red-500/10
                    text-red-500
                  "
                >
                  <Trash2 size={21} />
                </div>

                <div>

                  <h3 className="
                    text-lg
                    font-semibold
                  ">
                    Delete message?
                  </h3>

                  <p className="
                    text-sm
                    mt-0.5
                    text-[#667781]
                    dark:text-[#8696a0]
                  ">
                    Choose how you want to delete
                    this message.
                  </p>

                </div>

              </div>

            </div>

            <div className="
              px-4
              pb-4
              flex
              flex-col
              gap-1
            ">

              {/* DELETE FOR EVERYONE */}

              {deleteModal.senderId ===
                user.uid &&
                !deleteModal.deletedForEveryone && (

                <button
                  type="button"
                  onClick={deleteForEveryone}
                  disabled={deletingMessage}
                  className="
                    w-full
                    px-4
                    py-3
                    rounded-xl
                    flex
                    items-center
                    gap-3
                    text-left
                    text-red-500
                    hover:bg-red-50
                    dark:hover:bg-red-500/10
                    transition-all
                    duration-200
                    disabled:opacity-50
                  "
                >

                  <Trash2 size={19} />

                  <div>

                    <p className="
                      text-sm
                      font-medium
                    ">
                      Delete for everyone
                    </p>

                    <p className="
                      text-xs
                      mt-0.5
                      text-[#667781]
                      dark:text-[#8696a0]
                    ">
                      The message will appear as deleted
                      for both users.
                    </p>

                  </div>

                </button>

              )}

              {/* DELETE FOR ME */}

              <button
                type="button"
                onClick={deleteForMe}
                disabled={deletingMessage}
                className="
                  w-full
                  px-4
                  py-3
                  rounded-xl
                  flex
                  items-center
                  gap-3
                  text-left
                  text-[#111b21]
                  dark:text-[#e9edef]
                  hover:bg-[#f5f6f6]
                  dark:hover:bg-[#182229]
                  transition-all
                  duration-200
                  disabled:opacity-50
                "
              >

                <Trash2 size={19} />

                <div>

                  <p className="
                    text-sm
                    font-medium
                  ">
                    Delete for me
                  </p>

                  <p className="
                    text-xs
                    mt-0.5
                    text-[#667781]
                    dark:text-[#8696a0]
                  ">
                    This message will only be removed
                    from your chat.
                  </p>

                </div>

              </button>

              {/* CANCEL */}

              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deletingMessage}
                className="
                  w-full
                  mt-2
                  py-3
                  rounded-xl
                  text-sm
                  font-medium
                  text-[#008069]
                  dark:text-[#00a884]
                  hover:bg-[#f5f6f6]
                  dark:hover:bg-[#182229]
                  transition-all
                  duration-200
                  disabled:opacity-50
                "
              >
                {deletingMessage
                  ? "Deleting..."
                  : "Cancel"}
              </button>

            </div>

          </div>

        </div>

      )}

    </>
  );
};

export default ChatSystem;