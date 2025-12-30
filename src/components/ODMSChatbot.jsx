import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';

const ODMSChatbot = () => {
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: "Hello! I'm your Organ Donation Assistant. I can help you with:\n\n• Understanding organ donation process\n• Eligibility criteria\n• Debunking common myths\n• Guiding you through registration\n• Answering general questions\n\nHow can I assist you today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // FAQ knowledge base
  const faqDatabase = {
    eligibility: {
      keywords: ['eligible', 'who can donate', 'age limit', 'criteria', 'qualify'],
      response: "**Eligibility Criteria for Organ Donation:**\n\n✓ **Age:** Anyone can register, but typically 18+ years\n✓ **Health:** Good general health at the time of donation\n✓ **Consent:** Voluntary decision with family awareness\n✓ **Medical History:** Some conditions may affect specific organs\n\n**Important:** Even with medical conditions, you may still donate some organs. Medical professionals make the final determination at the time of donation.\n\nWould you like to know about any specific medical condition?"
    },
    process: {
      keywords: ['process', 'how to donate', 'procedure', 'steps', 'how does it work'],
      response: "**Organ Donation Process:**\n\n**1. Registration** (5 minutes)\n   • Fill out the online form\n   • Provide basic medical information\n   • Upload ID proof\n\n**2. Verification**\n   • Document verification\n   • Medical history review\n\n**3. Donor Card**\n   • Receive digital donor card\n   • Share with family members\n\n**4. Database Entry**\n   • Added to national registry\n   • Matching algorithm activated\n\n**For Living Donation:**\n   • Additional medical tests required\n   • Counseling sessions\n   • Surgery scheduling\n\nShall I guide you through the registration process?"
    },
    myths: {
      keywords: ['myth', 'misconception', 'false', 'rumor', 'belief'],
      response: "**Common Myths Debunked:**\n\n❌ **Myth 1:** \"Doctors won't try to save my life\"\n✓ **Truth:** Medical teams are separate from transplant teams. Your care comes first, always.\n\n❌ **Myth 2:** \"I'm too old to donate\"\n✓ **Truth:** There's no age limit. Organs are evaluated individually at the time.\n\n❌ **Myth 3:** \"Rich people get preferential treatment\"\n✓ **Truth:** Allocation is based on medical urgency, compatibility, and waiting time only.\n\n❌ **Myth 4:** \"My religion doesn't allow it\"\n✓ **Truth:** Most religions support organ donation as an act of charity and saving lives.\n\n❌ **Myth 5:** \"My body will be disfigured\"\n✓ **Truth:** Surgical procedures are respectful and cosmetically sensitive.\n\nWant to know more about any specific myth?"
    },
    organs: {
      keywords: ['which organs', 'what can be donated', 'types of organs', 'kidney', 'liver', 'heart'],
      response: "**Organs & Tissues That Can Be Donated:**\n\n**Major Organs:**\n❤️ Heart\n🫁 Lungs (both)\n🔴 Liver\n🩸 Kidneys (both)\n🥞 Pancreas\n🧠 Intestines\n\n**Tissues:**\n👁️ Corneas\n🦴 Bones\n💪 Tendons\n💓 Heart valves\n🧬 Skin\n🩸 Blood vessels\n\n**Living Donation Possible:**\n• One kidney\n• Portion of liver\n• Portion of lung\n• Portion of pancreas\n• Bone marrow\n\nOne donor can save up to 8 lives and enhance 75+ lives through tissue donation!\n\nWant to know about a specific organ?"
    },
    registration: {
      keywords: ['register', 'sign up', 'how to register', 'join', 'enroll'],
      response: "**Let me guide you through registration:**\n\n**Step 1: Basic Information**\n• Full name\n• Date of birth\n• Contact details\n• Address\n\n**Step 2: Medical Information**\n• Blood group\n• Existing medical conditions\n• Allergies\n• Current medications\n\n**Step 3: Documents**\n• Government ID (Aadhaar/Passport/Driving License)\n• Recent photograph\n\n**Step 4: Consent**\n• Read and agree to terms\n• Emergency contact\n• Family awareness confirmation\n\n**Time Required:** 5-10 minutes\n\nReady to start? Type 'start registration' or visit the registration page directly!"
    },
    living_donor: {
      keywords: ['living donor', 'donate while alive', 'living donation', 'donate kidney'],
      response: "**Living Organ Donation:**\n\nYou can donate while alive and save a life today!\n\n**What can be donated:**\n• One kidney (most common)\n• Part of liver (regenerates)\n• Part of lung\n• Part of pancreas\n• Bone marrow\n\n**Requirements:**\n✓ Age 18-60 years\n✓ Good physical and mental health\n✓ Compatible blood type\n✓ Willing to undergo medical evaluation\n✓ No high blood pressure or diabetes\n\n**Process:**\n1. Initial consultation\n2. Medical tests (2-3 weeks)\n3. Psychological evaluation\n4. Surgery scheduling\n5. Post-operative care\n\n**Recovery:** 4-6 weeks\n\n**Important:** All medical expenses typically covered by recipient's insurance.\n\nWant to know more about living donation?"
    },
    emergency: {
      keywords: ['emergency', 'urgent', 'immediate', 'critical', 'now'],
      response: "🚨 **For Medical Emergencies:**\n\nIf you or someone needs an organ urgently:\n\n**Immediate Actions:**\n1. Contact your doctor/hospital immediately\n2. Get registered on the transplant waiting list\n3. Ensure all medical records are updated\n\n**Emergency Helpline:** [Your helpline number]\n**Email:** emergency@odms.org\n\n**For Donor Emergency:**\nIf you have information about a potential donor in critical condition, please contact the nearest transplant center immediately.\n\n**Remember:** Time is critical in organ transplantation.\n\nNeed help contacting a hospital?"
    }
  };

  const findBestResponse = (userInput) => {
    const input = userInput.toLowerCase();
    
    // Check for greetings
    if (/^(hi|hello|hey|greetings|namaste|good morning|good evening)/.test(input)) {
      return "Hello! How can I help you with organ donation today? You can ask me about:\n• Eligibility criteria\n• Donation process\n• Common myths\n• Registration steps\n• Specific organs";
    }

    // Check for thanks
    if (/^(thanks|thank you|appreciated)/.test(input)) {
      return "You're welcome! If you have any more questions about organ donation, feel free to ask. Remember, your decision to become a donor can save up to 8 lives! 💚";
    }

    // Search through FAQ database
    for (const [category, data] of Object.entries(faqDatabase)) {
      for (const keyword of data.keywords) {
        if (input.includes(keyword)) {
          return data.response;
        }
      }
    }

    // Check for specific keywords
    if (input.includes('family') || input.includes('tell family')) {
      return "**Informing Your Family:**\n\nIt's crucial to discuss your decision with family members:\n\n✓ **Why it matters:** Family consent is often required\n✓ **How to approach:** Share your motivations and values\n✓ **Resources:** We can provide family discussion guides\n✓ **Legal aspect:** In India, family consent is typically needed\n\n**Tips:**\n• Choose a calm, comfortable setting\n• Explain why it's important to you\n• Address their concerns\n• Share educational materials\n• Document their awareness\n\nWould you like tips on how to have this conversation?";
    }

    if (input.includes('cost') || input.includes('price') || input.includes('fee')) {
      return "**Costs Related to Organ Donation:**\n\n💰 **Registration:** Completely FREE\n💰 **Being a Donor:** NO COST to you or your family\n💰 **Living Donation:** All medical expenses typically covered by recipient\n💰 **Deceased Donation:** No cost to donor's family\n\n**Important:** Organ donation should never involve financial transactions. It's illegal to buy or sell organs.\n\nIf anyone asks for money, please report it immediately!\n\nHave other questions?";
    }

    if (input.includes('cancel') || input.includes('remove') || input.includes('unregister')) {
      return "**Changing Your Mind:**\n\nYou can change your decision at any time! \n\n**To update or cancel:**\n1. Log into your account\n2. Go to 'My Profile'\n3. Select 'Donation Status'\n4. Update your preferences\n\n**Remember:**\n• It's completely your choice\n• No judgment or questions asked\n• You can re-register later\n• Inform your family about changes\n\nNeed help with account access?";
    }

    // Default response for unrecognized queries
    return "I'm not sure I fully understood your question. Here's what I can help you with:\n\n1️⃣ **Eligibility** - Who can donate organs?\n2️⃣ **Process** - How does organ donation work?\n3️⃣ **Myths** - Common misconceptions debunked\n4️⃣ **Registration** - Step-by-step guide\n5️⃣ **Organs** - What can be donated?\n6️⃣ **Living Donation** - Donate while alive\n\nCould you please rephrase your question or choose from the topics above?";
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      type: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI processing delay
    setTimeout(() => {
      const botResponse = {
        type: 'bot',
        text: findBestResponse(input),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
      setIsLoading(false);
    }, 800);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { label: 'Eligibility Criteria', query: 'Who is eligible to donate organs?' },
    { label: 'How to Register', query: 'How do I register as an organ donor?' },
    { label: 'Common Myths', query: 'What are common myths about organ donation?' },
    { label: 'Donation Process', query: 'What is the organ donation process?' }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-500 text-white p-6">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
            <Bot size={32} />
          </div>
          <div>
            <h2 className="font-bold text-2xl">ODMS AI Assistant</h2>
            <p className="text-white/90 text-sm">Ask me anything about organ donation</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="h-[500px] overflow-y-auto p-6 space-y-4 bg-gray-50 dark:bg-gray-900">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.type === 'bot' && (
              <div className="bg-gradient-to-br from-green-500 to-green-500 text-white p-2 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
                <Bot size={20} />
              </div>
            )}
            <div
              className={`max-w-[75%] p-4 rounded-2xl ${
                message.type === 'user'
                  ? 'bg-gradient-to-r from-green-500 to-green-500 text-white rounded-br-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-sm shadow-md border border-gray-200 dark:border-gray-700'
              }`}
            >
              <p className="text-sm whitespace-pre-line leading-relaxed">{message.text}</p>
              <p className={`text-xs mt-2 ${message.type === 'user' ? 'text-white/70' : 'text-gray-400'}`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {message.type === 'user' && (
              <div className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 p-2 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
                <User size={20} />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="bg-gradient-to-br from-green-500 to-green-500 text-white p-2 rounded-full h-10 w-10 flex items-center justify-center">
              <Bot size={20} />
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl rounded-bl-sm shadow-md">
              <Loader2 className="animate-spin text-red-500" size={24} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 2 && (
        <div className="px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 font-medium">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => setInput(action.query)}
                className="text-sm bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-4 py-2 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors border border-green-200 dark:border-green-800"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about organ donation..."
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-r from-green-500 to-green-500 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send size={20} />
            <span className="font-medium">Send</span>
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">
          Powered by NixBot • Saves lives through information
        </p>
      </div>
    </div>
  );
};

export default ODMSChatbot;