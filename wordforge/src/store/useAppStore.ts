import { create } from "zustand";

type AppState = {
  greetMsg: string;
  setGreetMsg: (msg: string) => void;
};

export const useAppStore = create<AppState>((set) => ({
  greetMsg: "",
  setGreetMsg: (msg) => set({ greetMsg: msg }),
}));
