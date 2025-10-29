"use client";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function LevelSelect({ value, onChange }) {
  return (
    <div className="mt-4">
      <label className="block text-xl font-bold mb-2 
             bg-gradient-to-r from-blue-400 to-cyan-600 
             bg-clip-text text-transparent">
        Level
      </label>

      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-64 p-5.5 px-5 mt-1 font-medium font-semibold rounded-xl bg-gray-800 text-cyan-100 border-2 border-blue-400 mb-2 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150 appearance-none">
          <SelectValue placeholder="Choose level" />
        </SelectTrigger>

        <SelectContent className="bg-gray-800 text-cyan-100 font-medium rounded-xl border border-blue-500">
          <SelectItem value="beginner" className="rounded-md px-4 py-3 hover:bg-blue-700 cursor-pointer">
            🌱 Beginner (Simple)
          </SelectItem>
          <SelectItem value="intermediate" className="rounded-md px-4 py-3 hover:bg-blue-700 cursor-pointer">
            📘   Intermediate (Clear)
          </SelectItem>
          <SelectItem value="advanced" className="rounded-md px-4 py-3 hover:bg-blue-700 cursor-pointer">
            🎓 Advanced (Detailed)
          </SelectItem>
          <SelectItem value="professional" className="rounded-md px-4 py-3 hover:bg-blue-700 cursor-pointer">
            🧠 Professional (Scholarly)
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
