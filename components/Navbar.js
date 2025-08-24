export default function Navbar() {
  return (
    <nav className="flex justify-between items-center text-white">
      <div className="font-bold text-xl">Fachs College LMS</div>
      <div className="space-x-4">
        <a href="/">Home</a>
        <a href="/auth/signin">Sign In</a>
        <a href="/auth/signup">Sign Up</a>
      </div>
    </nav>
  );
}
