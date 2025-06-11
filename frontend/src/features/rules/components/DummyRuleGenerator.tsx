import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";

type Props = {
  restartPage: () => void;
  tenantId: string;
}

export default function DummyRulesGenerator({ restartPage, tenantId }: Props) {
  const [count, setCount] = useState<number>(1000);
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const createDummyRules = (count: number) => {
    const socket = new WebSocket('ws://localhost:4001');

    socket.onopen = () => {
      setMessage("");
      setProgress(0);
      setIsRunning(true);
      socket.send(JSON.stringify({ count, tenantId }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if(data.message) {
        setMessage(data.message);
      } else if (data.progress !== undefined) {
        if(message) {
          setMessage("");
        }
        setProgress(data.progress);
      } else if (data.done) {
        setIsRunning(false);
        socket.close();
        toast({
            title: "✅ Génération succesfull",
            description: `${count} have been generated on the server successfully.`,
          });
        setTimeout(() => {
          restartPage();
        }, 1000); // Restart page after 1 second
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

      {isRunning && message && (
        <div className="w-full bg-gray-200 h-4 rounded">
          {message}
        </div>
      )}

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
