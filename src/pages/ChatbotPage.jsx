// ----------------------------------------------
// src/pages/ChatbotPage.jsx
// ----------------------------------------------
import React from 'react';
import ODMSChatbot from '../components/ODMSChatbot';
import { motion } from "framer-motion";

const ChatbotPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center mb-8"
        >
          
        </motion.div>

        {/* Chatbot Component */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-10"
        >
          <ODMSChatbot />
        </motion.div>

        {/* Additional Info Section */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          
          {[ 
            { icon:"📚", title:"Knowledge Base", text:"Access comprehensive information about organ donation, eligibility, and processes." },
            { icon:"💡", title:"Myth Busting", text:"Get facts and debunk common misconceptions about organ donation." },
            { icon:"🤝", title:"24/7 Support", text:"Our AI assistant is available anytime to guide you through your journey." },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.2 }}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transform transition-all"
            >
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">
                {item.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {item.text}
              </p>
            </motion.div>
          ))}

        </div>
      </div>
    </div>
  );
};

export default ChatbotPage;
