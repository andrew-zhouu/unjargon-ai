export default function TextInput({ value, onChange }) {
  return (
    <textarea
      className="w-full p-5 border-2 border-blue-400 rounded-xl 
                 text-white font-semibold bg-gray-800 
                 placeholder-gray-400 
                 focus:outline-none focus:ring-2 focus:ring-cyan-500 
                 transition duration-150 resize-none"
      placeholder="Paste complicated text here..."
      value={value}
      onChange={onChange}
      rows={12}
    />
  );
}

