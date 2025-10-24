"use client";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";



export default function DomainSelect({ value, onChange }) {
  return (
    <div className="">
      <label className="block text-xl font-bold mb-2 mt-3
             bg-gradient-to-r from-blue-400 to-cyan-600 
             bg-clip-text text-transparent">
        Domain
      </label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-64 p-5.5 px-5 mt-1 font-medium rounded-xl bg-gray-800 text-cyan-100 border-2 border-blue-400 mb-2 
                 focus:outline-none focus:ring-2 focus:ring-blue-500 
                 transition duration-150 appearance-none">
        <SelectValue placeholder="Choose domain" />
      </SelectTrigger>

      <SelectContent className="bg-gray-800 text-cyan-100 font-medium rounded-xl border border-blue-500">
        <SelectItem value="general" className="rounded-md px-4 py-4 hover:bg-blue-700 cursor-pointer">
          🌐 General
        </SelectItem>
        <SelectItem value="legal" className="rounded-md px-4 py-4 hover:bg-blue-700 cursor-pointer">
          ⚖️ Legal
        </SelectItem>
        <SelectItem value="medical" className="rounded-md px-4 py-4 hover:bg-blue-700 cursor-pointer">
          🩺 Medical
        </SelectItem>
        <SelectItem value="government" className="rounded-md px-4 py-4 hover:bg-blue-700 cursor-pointer">
          🏛️ Government
        </SelectItem>
        <SelectItem value="education" className="rounded-md px-4 py-4 hover:bg-blue-700 cursor-pointer">
          📘 Education
        </SelectItem>
        <SelectItem value="financial" className="rounded-md px-4 py-4 hover:bg-blue-700 cursor-pointer">
          💰 Financial
        </SelectItem>
        <SelectItem 
          value="nutrition" className="rounded-md px-4 py-4 hover:bg-blue-700 cursor-pointer">🥗 Nutritional (New!)
        </SelectItem>
      </SelectContent>
    </Select>
    </div>
  );
}
