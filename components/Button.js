export default function Button({ children, className = '', ...props }) {
  return (
    <button
      className={`bg-blue-600 hover:bg-blue-700 text-blue font-semibold py-2 px-4 rounded ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
