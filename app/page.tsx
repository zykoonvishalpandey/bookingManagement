import Image from "next/image";

export default function Home() {
  return (<div>
    <h1>Welcome to My App</h1>
    <p>This is the home page of your Next.js application.</p>
    <Image src="/logo.png" alt="Logo" width={150} height={150} />
    <p>Explore the features and enjoy your stay!</p>
  </div>
  );
}
