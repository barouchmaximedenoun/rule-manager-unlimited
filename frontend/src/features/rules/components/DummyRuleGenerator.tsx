import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";

export default function DummyRulesGenerator() {
  const [count, setCount] = useState<number>(1000);
  const [progress, setProgress] = useState<number>(0);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const createDummyRules = (count: number) => {
    const socket = new WebSocket('ws://localhost:4000');

    socket.onopen = () => {
      setIsRunning(true);
      socket.send(JSON.stringify({ count }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.progress !== undefined) {
        setProgress(data.progress);
      } else if (data.done) {
        setIsRunning(false);
        socket.close();
        toast({
            title: "✅ Génération succesfull",
            description: `${count} have been generated on the server successfully.`,
          });
        // Optionnel : refresh la liste des règles ici si tu veux
      }
    };
  };

  return (
    <div className="p-4 border rounded-xl space-y-4">
      <h2 className="text-lg font-semibold">Generate dummy rules for testing</h2>

      <div className="flex items-center gap-2">
        <label htmlFor="dummy-count" className="font-medium">Number :</label>
        <input
          id="dummy-count"
          type="number"
          value={count}
          onChange={(e) => setCount(parseInt(e.target.value, 10))}
          className="border rounded px-2 py-1 w-32"
          min={1}
          max={1_000_000}
        />
        <button
          onClick={() => createDummyRules(count)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={isRunning}
        >
          Lancer
        </button>
      </div>

      {isRunning && (
        <div className="w-full bg-gray-200 h-4 rounded">
          <div
            className="bg-green-500 h-4 rounded"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}

      {isRunning && (
        <p className="text-sm text-gray-600">
          Progression : {Math.round(progress * 100)}%
        </p>
      )}
    </div>
  );
}
