import { ModeToggle } from "@/components/mode-togle";
import { Button } from "@/components/ui/button";
import { UserButton } from "@clerk/nextjs";

const state = true;

export default function Home() {
  return (
    <div>
      <UserButton 
        afterSignOutUrl="/"
      />
      <ModeToggle />
    </div>
  ) 
}
