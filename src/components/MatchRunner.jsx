import React, { useState } from "react";
import axios from "axios";

const MatchRunner = () => {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState([]);

  const runMatch = async () => {
    setLoading(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_FUNCTIONS_BASE_URL}/api/run-match`
      );
      setMatches(res.data.matches);
    } catch (error) {
      console.error("Error running match:", error);
    }
    setLoading(false);
  };

  return (
    <div className="p-4">
      <button
        onClick={runMatch}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        {loading ? "Running..." : "Run Match"}
      </button>

      <ul className="mt-4">
        {matches.map((m, i) => (
          <li key={i} className="border p-2 rounded">
            Donor: {m.donorId} → Recipient: {m.recipientId} ({m.organType})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MatchRunner;
