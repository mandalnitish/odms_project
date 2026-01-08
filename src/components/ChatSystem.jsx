import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, Minimize2, Maximize2, Users, Search, Phone, Video, MoreVertical, Paperclip, Smile, Check, CheckCheck, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore';

const ChatSystem = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [allowedUsers, setAllowedUsers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get current user's role
  useEffect(() => {
    if (!user) return;

    const loadCurrentUser = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('__name__', '==', user.uid));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const userData = snapshot.docs[0].data();
          setCurrentUserRole(userData.role || 'user');
        }
      } catch (error) {
        console.error('Error loading current user:', error);
      }
    };

    loadCurrentUser();
  }, [user]);

  // Load matches (for donors and recipients)
  useEffect(() => {
    if (!user || !currentUserRole) return;
    if (currentUserRole !== 'donor' && currentUserRole !== 'recipient') return;

    const matchesRef = collection(db, 'matches');
    const q = query(
      matchesRef,
      where(currentUserRole === 'donor' ? 'donorId' : 'recipientId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const matchData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setMatches(matchData);
    });

    return () => unsubscribe();
  }, [user, currentUserRole]);

  // Load all users first
  useEffect(() => {
    if (!user) return;

    const loadUsers = async () => {
      try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        const allUsersData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(u => u.id !== user.uid);

        setAllUsers(allUsersData);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };

    loadUsers();
  }, [user]);

  // Load allowed users based on role and matches
  useEffect(() => {
    if (!user || !currentUserRole || allUsers.length === 0) return;

    const loadAllowedUsers = () => {
      try {
        let allowed = [];

        if (currentUserRole === 'doctor' || currentUserRole === 'admin') {
          allowed = allUsers;
        } else if (currentUserRole === 'donor') {
          const matchedRecipientIds = matches.map(m => m.recipientId);
          allowed = allUsers.filter(u => 
            u.role === 'doctor' || 
            u.role === 'admin' ||
            matchedRecipientIds.includes(u.id)
          );
        } else if (currentUserRole === 'recipient') {
          const matchedDonorIds = matches.map(m => m.donorId);
          allowed = allUsers.filter(u => 
            u.role === 'doctor' || 
            u.role === 'admin' ||
            matchedDonorIds.includes(u.id)
          );
        }

        setAllowedUsers(allowed);
      } catch (error) {
        console.error('Error filtering allowed users:', error);
      }
    };

    loadAllowedUsers();
  }, [user, currentUserRole, matches, allUsers]);

  // Load conversations
  useEffect(() => {
    if (!user) return;

    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      convos.sort((a, b) => {
        const timeA = a.lastMessageTime?.toDate?.() || new Date(0);
        const timeB = b.lastMessageTime?.toDate?.() || new Date(0);
        return timeB - timeA;
      });
      
      setConversations(convos);

      const unread = convos.reduce((count, convo) => {
        const unreadForUser = convo.unreadCount?.[user.uid] || 0;
        return count + unreadForUser;
      }, 0);
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, [user]);

  // Load messages for selected chat
  useEffect(() => {
    if (!selectedChat) return;

    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('conversationId', '==', selectedChat.id),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setMessages(msgs);
      markAsRead(selectedChat.id);
    }, (error) => {
      console.error('Error loading messages:', error);
      if (error.code === 'failed-precondition') {
        const simpleQuery = query(
          messagesRef,
          where('conversationId', '==', selectedChat.id)
        );
        
        const unsubscribeSimple = onSnapshot(simpleQuery, (snapshot) => {
          const msgs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          msgs.sort((a, b) => {
            const timeA = a.timestamp?.toDate?.() || new Date(0);
            const timeB = b.timestamp?.toDate?.() || new Date(0);
            return timeA - timeB;
          });
          setMessages(msgs);
          markAsRead(selectedChat.id);
        });
        
        return unsubscribeSimple;
      }
    });

    return () => unsubscribe();
  }, [selectedChat]);

  // Mark conversation as read
  const markAsRead = async (conversationId) => {
    if (!user) return;

    try {
      const convoRef = doc(db, 'conversations', conversationId);
      await updateDoc(convoRef, {
        [`unreadCount.${user.uid}`]: 0
      });

      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        where('conversationId', '==', conversationId),
        where('senderId', '!=', user.uid),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(async (messageDoc) => {
        await updateDoc(doc(db, 'messages', messageDoc.id), { read: true });
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Check if user is allowed to chat
  const isUserAllowed = (userId) => {
    return allowedUsers.some(u => u.id === userId);
  };

  // Start new conversation
  const startConversation = async (otherUser) => {
    try {
      if (!isUserAllowed(otherUser.id)) {
        alert(`You can only chat with ${
          currentUserRole === 'donor' ? 'matched recipients and doctors' :
          currentUserRole === 'recipient' ? 'matched donors and doctors' :
          'everyone'
        }`);
        return;
      }

      const existingConvo = conversations.find(c => {
        const hasUser1 = c.participants.includes(user.uid);
        const hasUser2 = c.participants.includes(otherUser.id);
        return hasUser1 && hasUser2;
      });

      if (existingConvo) {
        setSelectedChat(existingConvo);
        setSearchQuery('');
        return;
      }

      const conversationsRef = collection(db, 'conversations');
      const newConvoData = {
        participants: [user.uid, otherUser.id],
        participantDetails: {
          [user.uid]: {
            name: user.displayName || user.email,
            role: currentUserRole
          },
          [otherUser.id]: {
            name: otherUser.fullName || otherUser.email,
            role: otherUser.role || 'user'
          }
        },
        lastMessage: '',
        lastMessageTime: serverTimestamp(),
        unreadCount: {
          [user.uid]: 0,
          [otherUser.id]: 0
        },
        createdAt: serverTimestamp()
      };

      const newConvo = await addDoc(conversationsRef, newConvoData);

      setSelectedChat({
        id: newConvo.id,
        participants: [user.uid, otherUser.id],
        participantDetails: {
          [user.uid]: {
            name: user.displayName || user.email,
            role: currentUserRole
          },
          [otherUser.id]: {
            name: otherUser.fullName || otherUser.email,
            role: otherUser.role || 'user'
          }
        }
      });
      
      setSearchQuery('');
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Failed to start conversation. Please try again.');
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    try {
      const messagesRef = collection(db, 'messages');
      await addDoc(messagesRef, {
        conversationId: selectedChat.id,
        senderId: user.uid,
        senderName: user.displayName || user.email,
        text: newMessage,
        timestamp: serverTimestamp(),
        read: false
      });

      const convoRef = doc(db, 'conversations', selectedChat.id);
      const otherUserId = selectedChat.participants.find(p => p !== user.uid);
      
      await updateDoc(convoRef, {
        lastMessage: newMessage,
        lastMessageTime: serverTimestamp(),
        [`unreadCount.${otherUserId}`]: (selectedChat.unreadCount?.[otherUserId] || 0) + 1
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Get other user in conversation
  const getOtherUser = (conversation) => {
    const otherUserId = conversation.participants.find(p => p !== user.uid);
    return conversation.participantDetails?.[otherUserId] || { name: 'Unknown', role: 'user' };
  };

  // Filter users for search
  const filteredUsers = allowedUsers.filter(u => {
    const matchesSearch = u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return searchQuery && matchesSearch;
  });

  // Filter conversations for search
  const filteredConversations = conversations.filter(convo => {
    if (!searchQuery) return true;
    
    const otherUser = getOtherUser(convo);
    return otherUser.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Get role badge color
  const getRoleBadge = (role) => {
    const colors = {
      donor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      recipient: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      doctor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  // Get relationship label
  const getRelationship = (otherUser) => {
    if (otherUser.role === 'doctor' || otherUser.role === 'admin') {
      return 'Medical Team';
    }
    
    const match = matches.find(m => 
      m.donorId === otherUser.id || m.recipientId === otherUser.id
    );
    
    if (match) {
      return `Matched - ${match.organType} (${match.bloodGroup})`;
    }
    
    return '';
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3 md:p-4 rounded-full shadow-2xl hover:shadow-xl transition-all duration-300 hover:scale-110 z-50"
      >
        <MessageCircle size={isMobile ? 24 : 28} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 md:-top-2 md:-right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 md:h-6 md:w-6 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  // Mobile full-screen view
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900">
        {/* Show conversation list when no chat selected */}
        {!selectedChat ? (
          <div className="flex flex-col h-full">
            {/* Mobile Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageCircle size={24} />
                  <h3 className="font-bold text-lg">Messages</h3>
                </div>
                <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" size={18} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
            </div>

            {/* Access Info Banner */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                {currentUserRole === 'doctor' || currentUserRole === 'admin' 
                  ? '👨‍⚕️ You can chat with all users'
                  : currentUserRole === 'donor'
                  ? '💙 Chat with matched recipients and doctors'
                  : currentUserRole === 'recipient'
                  ? '💜 Chat with matched donors and doctors'
                  : '💬 Search to start chatting'
                }
              </p>
            </div>

            {/* Matched Users Section */}
            {(currentUserRole === 'donor' || currentUserRole === 'recipient') && matches.length > 0 && allUsers.length > 0 && (
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                  <span>💝</span>
                  {currentUserRole === 'donor' ? 'Your Matched Recipients' : 'Your Matched Donors'}
                </p>
                <div className="space-y-2">
                  {(() => {
                    const uniqueMatches = [];
                    const seenUserIds = new Set();
                    
                    matches.forEach(match => {
                      const matchedUserId = currentUserRole === 'donor' ? match.recipientId : match.donorId;
                      if (!seenUserIds.has(matchedUserId)) {
                        seenUserIds.add(matchedUserId);
                        uniqueMatches.push(match);
                      }
                    });
                    
                    return uniqueMatches.map(match => {
                      const matchedUserId = currentUserRole === 'donor' ? match.recipientId : match.donorId;
                      const matchedUser = allUsers.find(u => u.id === matchedUserId);
                      
                      if (!matchedUser) return null;
                      
                      const hasConversation = conversations.some(c => c.participants.includes(matchedUser.id));
                      const userMatches = matches.filter(m => 
                        (currentUserRole === 'donor' ? m.recipientId : m.donorId) === matchedUserId
                      );
                      
                      return (
                        <button
                          key={match.id}
                          onClick={() => {
                            if (hasConversation) {
                              const existingConvo = conversations.find(c => c.participants.includes(matchedUser.id));
                              setSelectedChat(existingConvo);
                            } else {
                              startConversation(matchedUser);
                            }
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                          <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                            {(matchedUser.fullName || matchedUser.email)?.[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{matchedUser.fullName || matchedUser.email}</p>
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadge(matchedUser.role)}`}>
                                {matchedUser.role}
                              </span>
                              {userMatches.length === 1 ? (
                                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                  {userMatches[0].organType}
                                </span>
                              ) : (
                                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                  {userMatches.length} matches
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* Search Results */}
            {searchQuery && filteredUsers.length > 0 && (
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Search Results</p>
                <div className="space-y-2">
                  {filteredUsers.map(otherUser => {
                    const hasConversation = conversations.some(c => c.participants.includes(otherUser.id));
                    
                    return (
                      <button
                        key={otherUser.id}
                        onClick={() => {
                          if (hasConversation) {
                            const existingConvo = conversations.find(c => c.participants.includes(otherUser.id));
                            setSelectedChat(existingConvo);
                          } else {
                            startConversation(otherUser);
                          }
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {(otherUser.fullName || otherUser.email)?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{otherUser.fullName || otherUser.email}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadge(otherUser.role)}`}>
                            {otherUser.role}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <MessageCircle className="text-gray-300 dark:text-gray-600 mb-3" size={48} />
                  <p className="text-gray-500 dark:text-gray-400 mb-2">No conversations yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">Search for users to start chatting</p>
                </div>
              ) : (
                filteredConversations.map(convo => {
                  const otherUser = getOtherUser(convo);
                  const unreadForUser = convo.unreadCount?.[user.uid] || 0;
                  
                  return (
                    <button
                      key={convo.id}
                      onClick={() => setSelectedChat(convo)}
                      className="w-full flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {otherUser.name[0]?.toUpperCase()}
                        </div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{otherUser.name}</p>
                          {unreadForUser > 0 && (
                            <span className="bg-indigo-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0 ml-2">
                              {unreadForUser > 9 ? '9+' : unreadForUser}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {convo.lastMessage || 'Start a conversation'}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          // Chat view on mobile
          <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedChat(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <ArrowLeft size={20} />
                </button>
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                  {getOtherUser(selectedChat).name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{getOtherUser(selectedChat).name}</p>
                  <p className="text-xs text-green-600 dark:text-green-400">● Online</p>
                </div>
                <div className="flex gap-1">
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                    <Phone size={18} className="text-gray-600 dark:text-gray-400" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                    <Video size={18} className="text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
              {messages.map((msg, index) => {
                const isOwn = msg.senderId === user.uid;
                const showTimestamp = index === 0 || 
                  (messages[index - 1] && 
                   new Date(msg.timestamp?.toDate()).getTime() - new Date(messages[index - 1].timestamp?.toDate()).getTime() > 300000);

                return (
                  <div key={msg.id}>
                    {showTimestamp && msg.timestamp && (
                      <div className="flex justify-center my-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1 rounded-full">
                          {new Date(msg.timestamp.toDate()).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      {!isOwn && (
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {msg.senderName[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className={`p-3 rounded-2xl ${
                          isOwn 
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-sm' 
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm shadow-md'
                        }`}>
                          <p className="text-sm break-words">{msg.text}</p>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs text-gray-400">
                            {msg.timestamp && new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isOwn && (
                            msg.read ? 
                              <CheckCheck size={14} className="text-blue-500" /> : 
                              <Check size={14} className="text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <Paperclip size={20} className="text-gray-600 dark:text-gray-400" />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop/Tablet view
  return (
    <div className={`fixed ${isMinimized ? 'bottom-6 right-6' : 'bottom-6 right-6'} z-50 transition-all duration-300`}>
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl ${isMinimized ? 'w-80 h-16' : 'w-full md:w-[600px] lg:w-[900px] h-[500px] md:h-[600px]'} flex overflow-hidden border border-gray-200 dark:border-gray-700`}>
        
        {/* Header (Minimized) */}
        <div className={`${isMinimized ? 'w-full' : 'hidden'} bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <MessageCircle size={24} />
            <div>
              <h3 className="font-bold">Messages</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-white/80">{unreadCount} unread</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsMinimized(false)} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
              <Maximize2 size={18} />
            </button>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Sidebar - Conversations List */}
            <div className="w-full md:w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
              {/* Sidebar Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MessageCircle size={24} />
                    <h3 className="font-bold text-lg">Messages</h3>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setIsMinimized(true)} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                      <Minimize2 size={18} />
                    </button>
                    <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                      <X size={18} />
                    </button>
                  </div>
                </div>
                
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" size={18} />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                </div>
              </div>

              {/* Access Info Banner */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  {currentUserRole === 'doctor' || currentUserRole === 'admin' 
                    ? '👨‍⚕️ You can chat with all users'
                    : currentUserRole === 'donor'
                    ? '💙 Chat with matched recipients and doctors'
                    : currentUserRole === 'recipient'
                    ? '💜 Chat with matched donors and doctors'
                    : '💬 Search to start chatting'
                  }
                </p>
              </div>

              {/* Matched Users Section */}
              {(currentUserRole === 'donor' || currentUserRole === 'recipient') && matches.length > 0 && allUsers.length > 0 && (
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                    <span>💝</span>
                    {currentUserRole === 'donor' ? 'Your Matched Recipients' : 'Your Matched Donors'}
                  </p>
                  <div className="space-y-1 max-h-40 md:max-h-60 overflow-y-auto">
                    {(() => {
                      const uniqueMatches = [];
                      const seenUserIds = new Set();
                      
                      matches.forEach(match => {
                        const matchedUserId = currentUserRole === 'donor' ? match.recipientId : match.donorId;
                        if (!seenUserIds.has(matchedUserId)) {
                          seenUserIds.add(matchedUserId);
                          uniqueMatches.push(match);
                        }
                      });
                      
                      return uniqueMatches.map(match => {
                        const matchedUserId = currentUserRole === 'donor' ? match.recipientId : match.donorId;
                        const matchedUser = allUsers.find(u => u.id === matchedUserId);
                        
                        if (!matchedUser) return null;
                        
                        const hasConversation = conversations.some(c => c.participants.includes(matchedUser.id));
                        const userMatches = matches.filter(m => 
                          (currentUserRole === 'donor' ? m.recipientId : m.donorId) === matchedUserId
                        );
                        
                        return (
                          <button
                            key={match.id}
                            onClick={() => {
                              if (hasConversation) {
                                const existingConvo = conversations.find(c => c.participants.includes(matchedUser.id));
                                setSelectedChat(existingConvo);
                              } else {
                                startConversation(matchedUser);
                              }
                            }}
                            className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center text-white font-bold">
                              {(matchedUser.fullName || matchedUser.email)?.[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium text-sm text-gray-900 dark:text-white">{matchedUser.fullName || matchedUser.email}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadge(matchedUser.role)}`}>
                                  {matchedUser.role}
                                </span>
                                {userMatches.length === 1 ? (
                                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                    {userMatches[0].organType} ({userMatches[0].bloodGroup})
                                  </span>
                                ) : (
                                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                    {userMatches.length} matches
                                  </span>
                                )}
                                {hasConversation && (
                                  <span className="text-xs text-blue-600 dark:text-blue-400">● Chat Active</span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* Search Results */}
              {searchQuery && filteredUsers.length > 0 && (
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Search Results</p>
                  <div className="space-y-1 max-h-40 md:max-h-60 overflow-y-auto">
                    {filteredUsers.map(otherUser => {
                      const hasConversation = conversations.some(c => c.participants.includes(otherUser.id));
                      const relationship = getRelationship(otherUser);
                      
                      return (
                        <button
                          key={otherUser.id}
                          onClick={() => {
                            if (hasConversation) {
                              const existingConvo = conversations.find(c => c.participants.includes(otherUser.id));
                              setSelectedChat(existingConvo);
                            } else {
                              startConversation(otherUser);
                            }
                            setSearchQuery('');
                          }}
                          className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                            {(otherUser.fullName || otherUser.email)?.[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium text-sm text-gray-900 dark:text-white">{otherUser.fullName || otherUser.email}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadge(otherUser.role)}`}>
                                {otherUser.role}
                              </span>
                              {relationship && (
                                <span className="text-xs text-green-600 dark:text-green-400">
                                  {relationship}
                                </span>
                              )}
                              {hasConversation && (
                                <span className="text-xs text-blue-600 dark:text-blue-400">● Active</span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No Results */}
              {searchQuery && filteredUsers.length === 0 && (
                <div className="p-6 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No users found</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {currentUserRole === 'donor' 
                      ? 'You can only chat with matched recipients and doctors'
                      : currentUserRole === 'recipient'
                      ? 'You can only chat with matched donors and doctors'
                      : 'Try a different search term'
                    }
                  </p>
                </div>
              )}

              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <MessageCircle className="text-gray-300 dark:text-gray-600 mb-3" size={48} />
                    <p className="text-gray-500 dark:text-gray-400 mb-2">No conversations yet</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Search for users to start chatting</p>
                  </div>
                ) : filteredConversations.length === 0 && searchQuery ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <Search className="text-gray-300 dark:text-gray-600 mb-3" size={48} />
                    <p className="text-gray-500 dark:text-gray-400 mb-2">No conversations found</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Try searching for new users above</p>
                  </div>
                ) : (
                  filteredConversations.map(convo => {
                    const otherUser = getOtherUser(convo);
                    const unreadForUser = convo.unreadCount?.[user.uid] || 0;
                    const relationship = getRelationship(otherUser);
                    
                    return (
                      <button
                        key={convo.id}
                        onClick={() => setSelectedChat(convo)}
                        className={`w-full flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                          selectedChat?.id === convo.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                        }`}
                      >
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                            {otherUser.name[0]?.toUpperCase()}
                          </div>
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                        </div>
                        <div className="flex-1 text-left overflow-hidden">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">{otherUser.name}</p>
                            {unreadForUser > 0 && (
                              <span className="bg-indigo-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                {unreadForUser > 9 ? '9+' : unreadForUser}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadge(otherUser.role)}`}>
                              {otherUser.role}
                            </span>
                            {relationship && (
                              <span className="text-xs text-green-600 dark:text-green-400 truncate">
                                {relationship.split(' - ')[0]}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                            {convo.lastMessage || 'Start a conversation'}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedChat ? (
                <>
                  {/* Chat Header */}
                  <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                            {getOtherUser(selectedChat).name[0]?.toUpperCase()}
                          </div>
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{getOtherUser(selectedChat).name}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadge(getOtherUser(selectedChat).role)}`}>
                              {getOtherUser(selectedChat).role}
                            </span>
                            {getRelationship(getOtherUser(selectedChat)) && (
                              <span className="text-xs text-green-600 dark:text-green-400">
                                {getRelationship(getOtherUser(selectedChat))}
                              </span>
                            )}
                            <span className="text-xs text-green-600 dark:text-green-400">● Online</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                          <Phone size={20} className="text-gray-600 dark:text-gray-400" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                          <Video size={20} className="text-gray-600 dark:text-gray-400" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                          <MoreVertical size={20} className="text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                    {messages.map((msg, index) => {
                      const isOwn = msg.senderId === user.uid;
                      const showTimestamp = index === 0 || 
                        (messages[index - 1] && 
                         new Date(msg.timestamp?.toDate()).getTime() - new Date(messages[index - 1].timestamp?.toDate()).getTime() > 300000);

                      return (
                        <div key={msg.id}>
                          {showTimestamp && msg.timestamp && (
                            <div className="flex justify-center my-4">
                              <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1 rounded-full">
                                {new Date(msg.timestamp.toDate()).toLocaleString()}
                              </span>
                            </div>
                          )}
                          <div className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            {!isOwn && (
                              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                {msg.senderName[0]?.toUpperCase()}
                              </div>
                            )}
                            <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                              <div className={`p-3 rounded-2xl ${
                                isOwn 
                                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-sm' 
                                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm shadow-md'
                              }`}>
                                <p className="text-sm break-words">{msg.text}</p>
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-xs text-gray-400">
                                  {msg.timestamp && new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isOwn && (
                                  msg.read ? 
                                    <CheckCheck size={14} className="text-blue-500" /> : 
                                    <Check size={14} className="text-gray-400" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        <Paperclip size={20} className="text-gray-600 dark:text-gray-400" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        <Smile size={20} className="text-gray-600 dark:text-gray-400" />
                      </button>
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send size={20} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center mb-6">
                    <MessageCircle className="text-indigo-600 dark:text-indigo-400" size={48} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Welcome to ODMS Chat</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {currentUserRole === 'doctor' || currentUserRole === 'admin'
                      ? 'Select a conversation or search for any user to start chatting'
                      : currentUserRole === 'donor'
                      ? 'Chat with your matched recipients and medical team'
                      : currentUserRole === 'recipient'
                      ? 'Chat with your matched donors and medical team'
                      : 'Select a conversation to start chatting'
                    }
                  </p>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-full text-sm">Donors</span>
                    <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 rounded-full text-sm">Recipients</span>
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full text-sm">Doctors</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatSystem;