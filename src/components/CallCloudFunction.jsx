import React, { useState } from "react";

export default function CallCloudFunction({ donorId, recipientId }) {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const callFunction = async () => {
    setError(null);
    setResponse(null);

    if (!donorId || !recipientId) {
      setError("Please enter both Donor ID and Recipient ID.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        "http://127.0.0.1:5001/organ-donor-management-system/us-central1/manualMatchRunner",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ donorId, recipientId }),
        }
      );

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={callFunction}
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        {loading ? "Running..." : "Run Match Runner"}
      </button>

      {error && <p className="mt-2 text-red-600">{error}</p>}

      {response && response.ok && (
        <div className="mt-4">
          <h3 className="font-semibold">Matches Created:</h3>
          {response.matchesCreated && response.matchesCreated.length > 0 ? (
            <ul className="list-disc list-inside mt-2">
              {response.matchesCreated.map((match, idx) => (
                <li key={idx}>
                  Donor: {match.donorName} - Recipient: {match.recipientName} - Score: {match.score} - Status: {match.status}
                </li>
              ))}
            </ul>
          ) : (
            <p>No matches created.</p>
          )}
        </div>
      )}
    </div>
  );
}
