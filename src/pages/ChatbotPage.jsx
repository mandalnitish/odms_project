// ----------------------------------------------
// src/pages/ChatbotPage.jsx
// ----------------------------------------------
import React from 'react';
import ODMSChatbot from '../components/ODMSChatbot';

const ChatbotPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            AI Assistant
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Get instant answers to your organ donation questions
          </p>
        </div>

        {/* Chatbot Component */}
        <ODMSChatbot />

        {/* Additional Info Section */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="text-3xl mb-3">📚</div>
            <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">
              Knowledge Base
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Access comprehensive information about organ donation, eligibility, and processes.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="text-3xl mb-3">💡</div>
            <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">
              Myth Busting
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Get facts and debunk common misconceptions about organ donation.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="text-3xl mb-3">🤝</div>
            <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">
              24/7 Support
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Our AI assistant is available anytime to guide you through your journey.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatbotPage;