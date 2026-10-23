// Bloque 11: abrir la ficha de una casa desde cualquier pestaña (Reino, el
// escudo en el mapa o en Comercio). La hoja la pinta la partida (Game.tsx).

import { createContext, useContext } from "react";

export const OpenHouse = createContext<((house: number) => void) | null>(null);

export const useOpenHouse = () => useContext(OpenHouse);
