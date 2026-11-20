import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Binary,
  CircuitBoard,
  Cpu,
  Gauge,
  GitBranch,
  Globe,
  Lightbulb,
  Network,
  Search,
  Sigma,
  Star,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const TRACK_KEY = "voto.study-tools-shop.track.v1";
type Track =
  | "informatica"
  | "elettronica"
  | "meccatronica"
  | "grafica"
  | "turismo"
  | "afm"
  | "agraria"
  | "viticoltura"
  | "chimica"
  | "biotecnologie"
  | "enogastronomia"
  | "sala-vendita"
  | "accoglienza"
  | "rim"
  | "sia"
  | "cat"
  | "nautico"
  | "aeronautico"
  | "artistico"
  | "moda"
  | "audiovisivo"
  | "manutenzione"
  | "made-italy"
  | "odontotecnico"
  | "scientifico-vittorini"
  | "linguistico-vittorini"
  | "scienze-applicate-vittorini"
  | "tred-vittorini"
  | "biomedica-vittorini";
type ToolId =
  | "base-converter"
  | "binary-calculator"
  | "ascii-table"
  | "subnet-calculator"
  | "logic-gates"
  | "ohms-law"
  | "rc-time"
  | "led-resistor"
  | "voltage-divider"
  | "resistor-code"
  | "gear-ratio"
  | "torque-power"
  | "color-converter"
  | "aspect-ratio"
  | "travel-budget"
  | "exchange-converter"
  | "iva-calculator"
  | "break-even"
  | "print-resolution"
  | "percentage-calculator";

type ShopTool = {
  id: ToolId;
  title: string;
  description: string;
  track: Track;
  icon: LucideIcon;
  label: string;
};

const TOOLS: ShopTool[] = [
  {
    id: "base-converter",
    title: "Convertitore di basi",
    description: "Converti numeri tra sistema binario, ottale, decimale ed esadecimale.",
    track: "informatica",
    icon: Binary,
    label: "Numerazione",
  },
  {
    id: "binary-calculator",
    title: "Calcolatrice binaria",
    description: "Esegui somme, sottrazioni e moltiplicazioni in binario.",
    track: "informatica",
    icon: Cpu,
    label: "Aritmetica digitale",
  },
  {
    id: "ascii-table",
    title: "ASCII e Unicode",
    description: "Esplora caratteri, codici decimali, esadecimali e binari per la programmazione.",
    track: "informatica",
    icon: Sigma,
    label: "Codifica dei caratteri",
  },
  {
    id: "subnet-calculator",
    title: "Calcolatore subnet",
    description:
      "Ricava rete, broadcast, intervallo host e numero di indirizzi da IPv4 e prefisso.",
    track: "informatica",
    icon: Network,
    label: "Reti",
  },
  {
    id: "logic-gates",
    title: "Laboratorio porte logiche",
    description:
      "Prova AND, OR, XOR e NOT e osserva l'uscita della porta con una mini tabella di verità.",
    track: "informatica",
    icon: GitBranch,
    label: "Sistemi digitali",
  },
  {
    id: "ohms-law",
    title: "Legge di Ohm",
    description: "Ricava tensione, corrente o resistenza dai due valori noti.",
    track: "elettronica",
    icon: Zap,
    label: "Circuiti elettrici",
  },
  {
    id: "rc-time",
    title: "Costante di tempo RC",
    description: "Calcola la costante di tempo di un circuito resistore-condensatore.",
    track: "elettronica",
    icon: Activity,
    label: "Circuiti RC",
  },
  {
    id: "led-resistor",
    title: "Resistenza per LED",
    description:
      "Scegli la resistenza di protezione per un LED partendo da alimentazione e corrente.",
    track: "elettronica",
    icon: Lightbulb,
    label: "Laboratorio LED",
  },
  {
    id: "voltage-divider",
    title: "Partitore di tensione",
    description: "Calcola la tensione d'uscita e verifica il rapporto tra due resistenze.",
    track: "elettronica",
    icon: Gauge,
    label: "Misure elettriche",
  },
  {
    id: "resistor-code",
    title: "Codice colori resistori",
    description: "Leggi le bande del resistore e ricava valore nominale e tolleranza.",
    track: "elettronica",
    icon: CircuitBoard,
    label: "Componenti",
  },
  {
    id: "gear-ratio",
    title: "Rapporto di trasmissione",
    description: "Calcola rapporto, velocità e coppia tra due ingranaggi o pulegge.",
    track: "meccatronica",
    icon: GitBranch,
    label: "Meccanica applicata",
  },
  {
    id: "torque-power",
    title: "Coppia e potenza",
    description: "Passa da coppia e giri al minuto alla potenza meccanica dell'albero.",
    track: "meccatronica",
    icon: Gauge,
    label: "Macchine a fluido",
  },
  {
    id: "rc-time",
    title: "Costante di tempo RC",
    description: "Usa un circuito RC come esempio di sistema e misura la risposta nel tempo.",
    track: "meccatronica",
    icon: Activity,
    label: "Controlli",
  },
  {
    id: "voltage-divider",
    title: "Partitore per sensori",
    description: "Dimensiona un partitore per adattare il segnale di un sensore analogico.",
    track: "meccatronica",
    icon: CircuitBoard,
    label: "Automazione",
  },
  {
    id: "color-converter",
    title: "Laboratorio colori RGB",
    description: "Converti RGB, HEX e HSL per palette, web design e stampa digitale.",
    track: "grafica",
    icon: Lightbulb,
    label: "Teoria del colore",
  },
  {
    id: "aspect-ratio",
    title: "Proporzioni e formati",
    description: "Mantieni il rapporto d'aspetto per ridimensionare immagini e tavole grafiche.",
    track: "grafica",
    icon: Sigma,
    label: "Impaginazione",
  },
  {
    id: "base-converter",
    title: "Convertitore di basi",
    description: "Confronta i formati numerici usati nei file digitali e nella codifica colore.",
    track: "grafica",
    icon: Binary,
    label: "Tecnologie digitali",
  },
  {
    id: "print-resolution",
    title: "Risoluzione di stampa",
    description: "Stima pixel, centimetri e DPI per preparare un file alla stampa.",
    track: "grafica",
    icon: Search,
    label: "Prestampa",
  },
  {
    id: "travel-budget",
    title: "Budget di viaggio",
    description: "Somma trasporti, alloggio, pasti e attività per controllare il costo pro capite.",
    track: "turismo",
    icon: Globe,
    label: "Organizzazione viaggi",
  },
  {
    id: "exchange-converter",
    title: "Cambio valuta manuale",
    description: "Converti un importo usando il tasso di cambio inserito, senza dati online.",
    track: "turismo",
    icon: Sigma,
    label: "Geografia turistica",
  },
  {
    id: "aspect-ratio",
    title: "Proporzioni per materiali viaggio",
    description: "Mantieni le proporzioni per mappe, brochure e materiali di un itinerario.",
    track: "turismo",
    icon: Activity,
    label: "Itinerari",
  },
  {
    id: "percentage-calculator",
    title: "Sconti e percentuali",
    description: "Calcola sconti, ricarichi, commissioni e variazioni percentuali.",
    track: "turismo",
    icon: Gauge,
    label: "Economia del turismo",
  },
  {
    id: "iva-calculator",
    title: "IVA e prezzi",
    description: "Scorpora o aggiungi l'IVA e confronta imponibile, imposta e totale.",
    track: "afm",
    icon: Sigma,
    label: "Contabilità",
  },
  {
    id: "break-even",
    title: "Punto di pareggio",
    description: "Trova quante unità servono per coprire costi fissi e costi variabili.",
    track: "afm",
    icon: GitBranch,
    label: "Gestione aziendale",
  },
  {
    id: "percentage-calculator",
    title: "Margine e ricarico",
    description: "Passa dal costo al prezzo di vendita e verifica margine e ricarico.",
    track: "afm",
    icon: Gauge,
    label: "Marketing",
  },
  {
    id: "exchange-converter",
    title: "Conversione valuta aziendale",
    description: "Confronta importi e tassi per acquisti, fornitori e operazioni internazionali.",
    track: "afm",
    icon: Activity,
    label: "Finanza",
  },
  {
    id: "percentage-calculator",
    title: "Percentuali per rese e produzioni",
    description: "Strumento pratico per Agraria, Agroalimentare e Agroindustria.",
    track: "agraria",
    icon: Gauge,
    label: "Produzioni agricole",
  },
  {
    id: "aspect-ratio",
    title: "Proporzioni per miscele e trattamenti",
    description: "Strumento pratico per Agraria, Agroalimentare e Agroindustria.",
    track: "agraria",
    icon: Activity,
    label: "Gestione delle quantità",
  },
  {
    id: "travel-budget",
    title: "Budget di coltivazione",
    description: "Strumento pratico per Agraria, Agroalimentare e Agroindustria.",
    track: "agraria",
    icon: Globe,
    label: "Economia agraria",
  },
  {
    id: "exchange-converter",
    title: "Conversione unità e rese",
    description: "Strumento pratico per Agraria, Agroalimentare e Agroindustria.",
    track: "agraria",
    icon: Sigma,
    label: "Misure e dati",
  },
  {
    id: "percentage-calculator",
    title: "Calcolo rese uva-vino",
    description: "Strumento pratico per Viticoltura ed Enologia.",
    track: "viticoltura",
    icon: Gauge,
    label: "Produzioni vitivinicole",
  },
  {
    id: "aspect-ratio",
    title: "Proporzioni per soluzioni",
    description: "Strumento pratico per Viticoltura ed Enologia.",
    track: "viticoltura",
    icon: Activity,
    label: "Tecnologie enologiche",
  },
  {
    id: "travel-budget",
    title: "Costi di vendemmia",
    description: "Strumento pratico per Viticoltura ed Enologia.",
    track: "viticoltura",
    icon: Globe,
    label: "Economia della filiera",
  },
  {
    id: "exchange-converter",
    title: "Conversione tassi e misure",
    description: "Strumento pratico per Viticoltura ed Enologia.",
    track: "viticoltura",
    icon: Sigma,
    label: "Commercializzazione",
  },
  {
    id: "aspect-ratio",
    title: "Proporzioni di laboratorio",
    description: "Strumento pratico per Chimica e Materiali.",
    track: "chimica",
    icon: Activity,
    label: "Preparazioni chimiche",
  },
  {
    id: "percentage-calculator",
    title: "Calcolo percentuale soluzioni",
    description: "Strumento pratico per Chimica e Materiali.",
    track: "chimica",
    icon: Gauge,
    label: "Analisi chimica",
  },
  {
    id: "rc-time",
    title: "Costante e risposta RC",
    description: "Strumento pratico per Chimica e Materiali.",
    track: "chimica",
    icon: Activity,
    label: "Misure strumentali",
  },
  {
    id: "exchange-converter",
    title: "Conversione dati di analisi",
    description: "Strumento pratico per Chimica e Materiali.",
    track: "chimica",
    icon: Sigma,
    label: "Elaborazione dati",
  },
  {
    id: "percentage-calculator",
    title: "Percentuali e diluizioni",
    description: "Strumento pratico per Biotecnologie Sanitarie.",
    track: "biotecnologie",
    icon: Gauge,
    label: "Laboratorio biomedico",
  },
  {
    id: "aspect-ratio",
    title: "Proporzioni per campioni",
    description: "Strumento pratico per Biotecnologie Sanitarie.",
    track: "biotecnologie",
    icon: Activity,
    label: "Protocolli",
  },
  {
    id: "ascii-table",
    title: "Codifica dei campioni",
    description: "Strumento pratico per Biotecnologie Sanitarie.",
    track: "biotecnologie",
    icon: Sigma,
    label: "Sistemi informativi",
  },
  {
    id: "travel-budget",
    title: "Budget di laboratorio",
    description: "Strumento pratico per Biotecnologie Sanitarie.",
    track: "biotecnologie",
    icon: Globe,
    label: "Gestione laboratorio",
  },
  {
    id: "aspect-ratio",
    title: "Ridimensionatore ricette",
    description: "Strumento pratico per Enogastronomia.",
    track: "enogastronomia",
    icon: Activity,
    label: "Produzione gastronomica",
  },
  {
    id: "percentage-calculator",
    title: "Costo e prezzo del piatto",
    description: "Strumento pratico per Enogastronomia.",
    track: "enogastronomia",
    icon: Gauge,
    label: "Food cost",
  },
  {
    id: "travel-budget",
    title: "Budget del servizio",
    description: "Strumento pratico per Enogastronomia.",
    track: "enogastronomia",
    icon: Globe,
    label: "Organizzazione eventi",
  },
  {
    id: "exchange-converter",
    title: "Conversione misure in cucina",
    description: "Strumento pratico per Enogastronomia.",
    track: "enogastronomia",
    icon: Sigma,
    label: "Tecniche di cucina",
  },
  {
    id: "percentage-calculator",
    title: "Conto e ripartizione tavoli",
    description: "Strumento pratico per Servizi di Sala e di Vendita.",
    track: "sala-vendita",
    icon: Gauge,
    label: "Servizio di sala",
  },
  {
    id: "travel-budget",
    title: "Budget evento",
    description: "Strumento pratico per Servizi di Sala e di Vendita.",
    track: "sala-vendita",
    icon: Globe,
    label: "Organizzazione banchetti",
  },
  {
    id: "aspect-ratio",
    title: "Proporzioni del servizio",
    description: "Strumento pratico per Servizi di Sala e di Vendita.",
    track: "sala-vendita",
    icon: Activity,
    label: "Tecniche operative",
  },
  {
    id: "exchange-converter",
    title: "Cambio valuta per clienti",
    description: "Strumento pratico per Servizi di Sala e di Vendita.",
    track: "sala-vendita",
    icon: Sigma,
    label: "Accoglienza clienti",
  },
  {
    id: "travel-budget",
    title: "Preventivo soggiorno",
    description: "Strumento pratico per Accoglienza Turistica.",
    track: "accoglienza",
    icon: Globe,
    label: "Servizi ricettivi",
  },
  {
    id: "exchange-converter",
    title: "Cambio valuta del viaggiatore",
    description: "Strumento pratico per Accoglienza Turistica.",
    track: "accoglienza",
    icon: Sigma,
    label: "Geografia turistica",
  },
  {
    id: "percentage-calculator",
    title: "Sconti e commissioni",
    description: "Strumento pratico per Accoglienza Turistica.",
    track: "accoglienza",
    icon: Gauge,
    label: "Vendita dei servizi",
  },
  {
    id: "aspect-ratio",
    title: "Proporzioni per itinerari",
    description: "Strumento pratico per Accoglienza Turistica.",
    track: "accoglienza",
    icon: Activity,
    label: "Progettazione itinerari",
  },
  {
    id: "percentage-calculator",
    title: "Margini e variazioni commerciali",
    description: "Strumento pratico per Relazioni Internazionali per il Marketing.",
    track: "rim",
    icon: Gauge,
    label: "Marketing internazionale",
  },
  {
    id: "exchange-converter",
    title: "Cambio valuta commerciale",
    description: "Strumento pratico per Relazioni Internazionali per il Marketing.",
    track: "rim",
    icon: Sigma,
    label: "Commercio estero",
  },
  {
    id: "travel-budget",
    title: "Preventivo internazionale",
    description: "Strumento pratico per Relazioni Internazionali per il Marketing.",
    track: "rim",
    icon: Globe,
    label: "Negoziazione",
  },
  {
    id: "ascii-table",
    title: "Codifica dati aziendali",
    description: "Strumento pratico per Relazioni Internazionali per il Marketing.",
    track: "rim",
    icon: Sigma,
    label: "Comunicazione digitale",
  },
  {
    id: "base-converter",
    title: "Convertitore di basi per dati",
    description: "Strumento pratico per Sistemi Informativi Aziendali.",
    track: "sia",
    icon: Binary,
    label: "Informatica aziendale",
  },
  {
    id: "binary-calculator",
    title: "Calcolatrice binaria aziendale",
    description: "Strumento pratico per Sistemi Informativi Aziendali.",
    track: "sia",
    icon: Cpu,
    label: "Sistemi informativi",
  },
  {
    id: "ascii-table",
    title: "ASCII e codici dati",
    description: "Strumento pratico per Sistemi Informativi Aziendali.",
    track: "sia",
    icon: Sigma,
    label: "Basi di dati",
  },
  {
    id: "iva-calculator",
    title: "IVA e prezzi aziendali",
    description: "Strumento pratico per Sistemi Informativi Aziendali.",
    track: "sia",
    icon: Sigma,
    label: "Contabilità integrata",
  },
  {
    id: "aspect-ratio",
    title: "Proporzioni di tavole e rilievi",
    description: "Strumento pratico per Costruzioni, Ambiente e Territorio.",
    track: "cat",
    icon: Activity,
    label: "Disegno tecnico",
  },
  {
    id: "percentage-calculator",
    title: "Pendenze e percentuali",
    description: "Strumento pratico per Costruzioni, Ambiente e Territorio.",
    track: "cat",
    icon: Gauge,
    label: "Topografia",
  },
  {
    id: "travel-budget",
    title: "Budget di cantiere",
    description: "Strumento pratico per Costruzioni, Ambiente e Territorio.",
    track: "cat",
    icon: Globe,
    label: "Gestione cantiere",
  },
  {
    id: "print-resolution",
    title: "Risoluzione di stampa tecnica",
    description: "Strumento pratico per Costruzioni, Ambiente e Territorio.",
    track: "cat",
    icon: Search,
    label: "CAD e stampa",
  },
  {
    id: "gear-ratio",
    title: "Rapporti e velocità di trasmissione",
    description: "Strumento pratico per Nautico.",
    track: "nautico",
    icon: GitBranch,
    label: "Macchine marine",
  },
  {
    id: "torque-power",
    title: "Coppia e potenza del motore",
    description: "Strumento pratico per Nautico.",
    track: "nautico",
    icon: Gauge,
    label: "Propulsione",
  },
  {
    id: "travel-budget",
    title: "Budget di navigazione",
    description: "Strumento pratico per Nautico.",
    track: "nautico",
    icon: Globe,
    label: "Pianificazione",
  },
  {
    id: "base-converter",
    title: "Conversione dati e codici",
    description: "Strumento pratico per Nautico.",
    track: "nautico",
    icon: Binary,
    label: "Strumentazione",
  },
  {
    id: "percentage-calculator",
    title: "Rapporti e prestazioni",
    description: "Strumento pratico per Conduzione del mezzo aereo.",
    track: "aeronautico",
    icon: Gauge,
    label: "Navigazione aerea",
  },
  {
    id: "exchange-converter",
    title: "Conversione dati di volo",
    description: "Strumento pratico per Conduzione del mezzo aereo.",
    track: "aeronautico",
    icon: Sigma,
    label: "Strumentazione di volo",
  },
  {
    id: "aspect-ratio",
    title: "Proporzioni di rotta",
    description: "Strumento pratico per Conduzione del mezzo aereo.",
    track: "aeronautico",
    icon: Activity,
    label: "Pianificazione del volo",
  },
  {
    id: "travel-budget",
    title: "Budget operativo",
    description: "Strumento pratico per Conduzione del mezzo aereo.",
    track: "aeronautico",
    icon: Globe,
    label: "Gestione operativa",
  },
  {
    id: "color-converter",
    title: "Laboratorio colori RGB",
    description: "Strumento pratico per Liceo Artistico · Arti Figurative.",
    track: "artistico",
    icon: Lightbulb,
    label: "Teoria del colore",
  },
  {
    id: "aspect-ratio",
    title: "Proporzioni del disegno",
    description: "Strumento pratico per Liceo Artistico · Arti Figurative.",
    track: "artistico",
    icon: Activity,
    label: "Disegno e composizione",
  },
  {
    id: "print-resolution",
    title: "Risoluzione di stampa",
    description: "Strumento pratico per Liceo Artistico · Arti Figurative.",
    track: "artistico",
    icon: Search,
    label: "Tecniche digitali",
  },
  {
    id: "ascii-table",
    title: "Codifica dei caratteri",
    description: "Strumento pratico per Liceo Artistico · Arti Figurative.",
    track: "artistico",
    icon: Sigma,
    label: "Tecnologie artistiche",
  },
  {
    id: "aspect-ratio",
    title: "Proporzioni e cartamodelli",
    description: "Strumento pratico per Liceo Artistico · Design della Moda.",
    track: "moda",
    icon: Activity,
    label: "Progettazione moda",
  },
  {
    id: "color-converter",
    title: "Colori tessili e digitali",
    description: "Strumento pratico per Liceo Artistico · Design della Moda.",
    track: "moda",
    icon: Lightbulb,
    label: "Design del colore",
  },
  {
    id: "travel-budget",
    title: "Budget di confezione",
    description: "Strumento pratico per Liceo Artistico · Design della Moda.",
    track: "moda",
    icon: Globe,
    label: "Produzione e costi",
  },
  {
    id: "percentage-calculator",
    title: "Percentuali di taglio",
    description: "Strumento pratico per Liceo Artistico · Design della Moda.",
    track: "moda",
    icon: Gauge,
    label: "Modellistica",
  },
  {
    id: "color-converter",
    title: "Colori per video e grafica",
    description: "Strumento pratico per Liceo Artistico · Audiovisivo e Multimediale.",
    track: "audiovisivo",
    icon: Lightbulb,
    label: "Grafica digitale",
  },
  {
    id: "aspect-ratio",
    title: "Risoluzione e formato video",
    description: "Strumento pratico per Liceo Artistico · Audiovisivo e Multimediale.",
    track: "audiovisivo",
    icon: Activity,
    label: "Ripresa e montaggio",
  },
  {
    id: "print-resolution",
    title: "Pixel e DPI per immagini",
    description: "Strumento pratico per Liceo Artistico · Audiovisivo e Multimediale.",
    track: "audiovisivo",
    icon: Search,
    label: "Fotografia",
  },
  {
    id: "ascii-table",
    title: "Codifica audio-video",
    description: "Strumento pratico per Liceo Artistico · Audiovisivo e Multimediale.",
    track: "audiovisivo",
    icon: Sigma,
    label: "Tecnologie multimediali",
  },
  {
    id: "ohms-law",
    title: "Legge di Ohm per diagnosi",
    description: "Strumento pratico per Manutenzione e Assistenza Tecnica.",
    track: "manutenzione",
    icon: Zap,
    label: "Diagnostica elettrica",
  },
  {
    id: "led-resistor",
    title: "Resistenza per LED e segnali",
    description: "Strumento pratico per Manutenzione e Assistenza Tecnica.",
    track: "manutenzione",
    icon: Lightbulb,
    label: "Impianti e circuiti",
  },
  {
    id: "voltage-divider",
    title: "Partitore per sensori",
    description: "Strumento pratico per Manutenzione e Assistenza Tecnica.",
    track: "manutenzione",
    icon: Gauge,
    label: "Automazione",
  },
  {
    id: "gear-ratio",
    title: "Rapporto di trasmissione",
    description: "Strumento pratico per Manutenzione e Assistenza Tecnica.",
    track: "manutenzione",
    icon: GitBranch,
    label: "Meccanica",
  },
  {
    id: "color-converter",
    title: "Colori per prodotto e packaging",
    description: "Strumento pratico per Industria e Artigianato per il Made in Italy.",
    track: "made-italy",
    icon: Lightbulb,
    label: "Design del prodotto",
  },
  {
    id: "aspect-ratio",
    title: "Proporzioni di progetto",
    description: "Strumento pratico per Industria e Artigianato per il Made in Italy.",
    track: "made-italy",
    icon: Activity,
    label: "Progettazione",
  },
  {
    id: "percentage-calculator",
    title: "Costi e ricarichi",
    description: "Strumento pratico per Industria e Artigianato per il Made in Italy.",
    track: "made-italy",
    icon: Gauge,
    label: "Economia del prodotto",
  },
  {
    id: "print-resolution",
    title: "Risoluzione per cataloghi",
    description: "Strumento pratico per Industria e Artigianato per il Made in Italy.",
    track: "made-italy",
    icon: Search,
    label: "Comunicazione prodotto",
  },
  {
    id: "aspect-ratio",
    title: "Proporzioni di modelli",
    description: "Strumento pratico per Odontotecnico.",
    track: "odontotecnico",
    icon: Activity,
    label: "Anatomia e modellazione",
  },
  {
    id: "color-converter",
    title: "Colori e scale cromatiche",
    description: "Strumento pratico per Odontotecnico.",
    track: "odontotecnico",
    icon: Lightbulb,
    label: "Materiali estetici",
  },
  {
    id: "percentage-calculator",
    title: "Percentuali di materiali",
    description: "Strumento pratico per Odontotecnico.",
    track: "odontotecnico",
    icon: Gauge,
    label: "Laboratorio odontotecnico",
  },
  {
    id: "travel-budget",
    title: "Budget del laboratorio",
    description: "Strumento pratico per Odontotecnico.",
    track: "odontotecnico",
    icon: Globe,
    label: "Gestione laboratorio",
  },
  {
    id: "percentage-calculator",
    title: "Calcolatore scientifico di percentuali",
    description: "Strumento pratico per Liceo Scientifico · E. Vittorini.",
    track: "scientifico-vittorini",
    icon: Gauge,
    label: "Matematica",
  },
  {
    id: "color-converter",
    title: "Laboratorio colori e dati",
    description: "Strumento pratico per Liceo Scientifico · E. Vittorini.",
    track: "scientifico-vittorini",
    icon: Lightbulb,
    label: "Tecnologie",
  },
  {
    id: "aspect-ratio",
    title: "Proporzioni e grafici",
    description: "Strumento pratico per Liceo Scientifico · E. Vittorini.",
    track: "scientifico-vittorini",
    icon: Activity,
    label: "Rappresentazione",
  },
  {
    id: "ascii-table",
    title: "Codifica dei caratteri",
    description: "Strumento pratico per Liceo Scientifico · E. Vittorini.",
    track: "scientifico-vittorini",
    icon: Sigma,
    label: "Informatica",
  },
  {
    id: "exchange-converter",
    title: "Cambio valuta e viaggi",
    description: "Strumento pratico per Liceo Linguistico · E. Vittorini.",
    track: "linguistico-vittorini",
    icon: Sigma,
    label: "Lingue e turismo",
  },
  {
    id: "travel-budget",
    title: "Budget di soggiorno",
    description: "Strumento pratico per Liceo Linguistico · E. Vittorini.",
    track: "linguistico-vittorini",
    icon: Globe,
    label: "Cultura e mobilità",
  },
  {
    id: "percentage-calculator",
    title: "Percentuali e statistiche",
    description: "Strumento pratico per Liceo Linguistico · E. Vittorini.",
    track: "linguistico-vittorini",
    icon: Gauge,
    label: "Analisi dei dati",
  },
  {
    id: "aspect-ratio",
    title: "Formati e impaginazione",
    description: "Strumento pratico per Liceo Linguistico · E. Vittorini.",
    track: "linguistico-vittorini",
    icon: Activity,
    label: "Comunicazione",
  },
  {
    id: "binary-calculator",
    title: "Calcoli binari",
    description: "Strumento pratico per Liceo Scientifico · Scienze Applicate.",
    track: "scienze-applicate-vittorini",
    icon: Cpu,
    label: "Informatica",
  },
  {
    id: "subnet-calculator",
    title: "Reti e subnet",
    description: "Strumento pratico per Liceo Scientifico · Scienze Applicate.",
    track: "scienze-applicate-vittorini",
    icon: Network,
    label: "Sistemi e reti",
  },
  {
    id: "rc-time",
    title: "Laboratorio RC",
    description: "Strumento pratico per Liceo Scientifico · Scienze Applicate.",
    track: "scienze-applicate-vittorini",
    icon: Activity,
    label: "Laboratorio",
  },
  {
    id: "aspect-ratio",
    title: "Proporzioni sperimentali",
    description: "Strumento pratico per Liceo Scientifico · Scienze Applicate.",
    track: "scienze-applicate-vittorini",
    icon: Activity,
    label: "Metodo scientifico",
  },
  {
    id: "base-converter",
    title: "Conversione dati digitali",
    description: "Strumento pratico per Liceo Scientifico quadriennale · TRED.",
    track: "tred-vittorini",
    icon: Binary,
    label: "Transizione digitale",
  },
  {
    id: "logic-gates",
    title: "Porte logiche",
    description: "Strumento pratico per Liceo Scientifico quadriennale · TRED.",
    track: "tred-vittorini",
    icon: GitBranch,
    label: "Sistemi digitali",
  },
  {
    id: "print-resolution",
    title: "Risoluzione e formati",
    description: "Strumento pratico per Liceo Scientifico quadriennale · TRED.",
    track: "tred-vittorini",
    icon: Search,
    label: "Comunicazione digitale",
  },
  {
    id: "percentage-calculator",
    title: "Percentuali di progetto",
    description: "Strumento pratico per Liceo Scientifico quadriennale · TRED.",
    track: "tred-vittorini",
    icon: Gauge,
    label: "Transizione ecologica",
  },
  {
    id: "percentage-calculator",
    title: "Percentuali e diluizioni",
    description: "Strumento pratico per Liceo Scientifico · Biologia a curvatura biomedica.",
    track: "biomedica-vittorini",
    icon: Gauge,
    label: "Biologia",
  },
  {
    id: "aspect-ratio",
    title: "Proporzioni di laboratorio",
    description: "Strumento pratico per Liceo Scientifico · Biologia a curvatura biomedica.",
    track: "biomedica-vittorini",
    icon: Activity,
    label: "Laboratorio biomedico",
  },
  {
    id: "ascii-table",
    title: "Codifica dei campioni",
    description: "Strumento pratico per Liceo Scientifico · Biologia a curvatura biomedica.",
    track: "biomedica-vittorini",
    icon: Sigma,
    label: "Dati scientifici",
  },
  {
    id: "travel-budget",
    title: "Budget di laboratorio",
    description: "Strumento pratico per Liceo Scientifico · Biologia a curvatura biomedica.",
    track: "biomedica-vittorini",
    icon: Globe,
    label: "Organizzazione",
  },
];

const TRACK_LABELS: Record<Track, string> = {
  informatica: "Informatica",
  elettronica: "Elettronica",
  meccatronica: "Meccanica e Meccatronica",
  grafica: "Grafica e Comunicazione",
  turismo: "Turismo",
  afm: "Amministrazione, Finanza e Marketing",
  agraria: "Agraria, Agroalimentare e Agroindustria",
  viticoltura: "Viticoltura ed Enologia",
  chimica: "Chimica e Materiali",
  biotecnologie: "Biotecnologie Sanitarie",
  enogastronomia: "Enogastronomia",
  "sala-vendita": "Servizi di Sala e di Vendita",
  accoglienza: "Accoglienza Turistica",
  rim: "Relazioni Internazionali per il Marketing",
  sia: "Sistemi Informativi Aziendali",
  cat: "Costruzioni, Ambiente e Territorio (C.A.T.)",
  nautico: "Nautico",
  aeronautico: "Aeronautico",
  artistico: "Liceo Artistico · Arti Figurative",
  moda: "Liceo Artistico · Design della Moda",
  audiovisivo: "Liceo Artistico · Audiovisivo e Multimediale",
  manutenzione: "Manutenzione e Assistenza Tecnica",
  "made-italy": "Industria e Artigianato per il Made in Italy",
  odontotecnico: "Odontotecnico",
  "scientifico-vittorini": "Liceo Scientifico · E. Vittorini",
  "linguistico-vittorini": "Liceo Linguistico · E. Vittorini",
  "scienze-applicate-vittorini": "Liceo Scientifico · Scienze Applicate",
  "tred-vittorini": "Liceo Scientifico quadriennale · TRED",
  "biomedica-vittorini": "Liceo Scientifico · Curvatura Biomedica",
};
const BASES = [
  { value: "2", label: "Binario (base 2)" },
  { value: "8", label: "Ottale (base 8)" },
  { value: "10", label: "Decimale (base 10)" },
  { value: "16", label: "Esadecimale (base 16)" },
] as const;

function parseBaseValue(value: string, base: number): number | null {
  const cleaned = value.trim().replaceAll("_", "");
  if (!cleaned) return null;
  const digitPatterns: Record<number, RegExp> = {
    2: /^-?[01]+$/,
    8: /^-?[0-7]+$/,
    10: /^-?\d+$/,
    16: /^-?[\da-f]+$/i,
  };
  if (!digitPatterns[base]?.test(cleaned)) return null;
  const parsed = Number.parseInt(cleaned, base);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function NumberField({
  id,
  label,
  value,
  onChange,
  unit,
  step = "any",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  step?: string;
}) {
  return (
    <label htmlFor={id} className="block text-xs font-medium text-muted-foreground">
      {label}
      {unit ? ` (${unit})` : ""}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}

function BaseConverter() {
  const [sourceBase, setSourceBase] = useState("10");
  const [value, setValue] = useState("");
  const converted = parseBaseValue(value, Number(sourceBase));

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        La base del numero inserito
        <select
          aria-label="Base di partenza"
          value={sourceBase}
          onChange={(event) => setSourceBase(event.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground"
        >
          {BASES.map((base) => (
            <option key={base.value} value={base.value}>
              {base.label}
            </option>
          ))}
        </select>
      </label>
      <label
        htmlFor="base-converter-value"
        className="block text-xs font-medium text-muted-foreground"
      >
        Numero da convertire
        <input
          id="base-converter-value"
          aria-label="Numero da convertire"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Per esempio: 101101"
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      {value.trim() && converted === null ? (
        <p role="alert" className="text-xs text-danger">
          Il numero non è valido per la base selezionata.
        </p>
      ) : converted !== null ? (
        <dl className="grid grid-cols-2 gap-2">
          {BASES.map(({ value: base, label }) => (
            <div key={base} className="rounded-xl bg-surface p-3">
              <dt className="text-[10px] text-muted-foreground">{label}</dt>
              <dd className="mt-1 break-all font-mono text-sm font-semibold">
                {converted.toString(Number(base)).toUpperCase()}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-xs text-muted-foreground">
          Inserisci un numero intero per vedere le conversioni.
        </p>
      )}
    </div>
  );
}

function BinaryCalculator() {
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [operation, setOperation] = useState("+");
  const left = parseBaseValue(first, 2);
  const right = parseBaseValue(second, 2);
  const result =
    left === null || right === null
      ? null
      : operation === "+"
        ? left + right
        : operation === "−"
          ? left - right
          : left * right;
  const validResult = result !== null && Number.isSafeInteger(result);

  return (
    <div className="space-y-3">
      <NumberField id="binary-left" label="Primo numero" value={first} onChange={setFirst} />
      <label className="block text-xs font-medium text-muted-foreground">
        Operazione
        <select
          aria-label="Operazione binaria"
          value={operation}
          onChange={(event) => setOperation(event.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground"
        >
          <option value="+">Somma (+)</option>
          <option value="−">Sottrazione (−)</option>
          <option value="×">Moltiplicazione (×)</option>
        </select>
      </label>
      <NumberField id="binary-right" label="Secondo numero" value={second} onChange={setSecond} />
      {first && second ? (
        validResult ? (
          <p className="rounded-xl bg-primary-soft p-3 text-sm">
            Risultato: <strong className="font-mono">{result!.toString(2)}</strong>
            <span className="ml-2 text-xs text-muted-foreground">(decimale: {result})</span>
          </p>
        ) : (
          <p role="alert" className="text-xs text-danger">
            Inserisci due numeri binari interi validi.
          </p>
        )
      ) : (
        <p className="text-xs text-muted-foreground">
          Inserisci due numeri binari, ad esempio 1010 e 11.
        </p>
      )}
    </div>
  );
}

function AsciiTable() {
  const [value, setValue] = useState("");
  const code = value.length ? value.codePointAt(0) : undefined;
  const display = code === undefined ? null : code;

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Carattere o testo
        <input
          aria-label="Carattere da convertire"
          value={value}
          maxLength={1}
          onChange={(event) => setValue(event.target.value)}
          placeholder="A"
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground"
        />
      </label>
      {display !== null ? (
        <dl className="grid grid-cols-2 gap-2">
          {[
            ["Decimale", display.toString(10)],
            ["Esadecimale", `0x${display.toString(16).toUpperCase()}`],
            ["Binario", display.toString(2)],
            ["Unicode", `U+${display.toString(16).toUpperCase().padStart(4, "0")}`],
          ].map(([label, result]) => (
            <div key={label} className="rounded-xl bg-surface p-3">
              <dt className="text-[10px] text-muted-foreground">{label}</dt>
              <dd className="mt-1 break-all font-mono text-sm font-semibold">{result}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-xs text-muted-foreground">
          Inserisci un carattere per esplorarne la codifica.
        </p>
      )}
    </div>
  );
}

function ipToNumber(ip: string): number | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part))) return null;
  const values = parts.map(Number);
  if (values.some((part) => part < 0 || part > 255)) return null;
  return values.reduce((result, part) => result * 256 + part, 0) >>> 0;
}

function numberToIp(value: number) {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join(".");
}

function SubnetCalculator() {
  const [ip, setIp] = useState("192.168.1.10");
  const [prefix, setPrefix] = useState("24");
  const address = ipToNumber(ip);
  const prefixNumber = Number(prefix);
  const valid =
    address !== null && Number.isInteger(prefixNumber) && prefixNumber >= 0 && prefixNumber <= 32;
  const mask = valid ? (prefixNumber === 0 ? 0 : (0xffffffff << (32 - prefixNumber)) >>> 0) : null;
  const network = valid && mask !== null ? (address! & mask) >>> 0 : null;
  const broadcast = valid && mask !== null ? (network! | (~mask >>> 0)) >>> 0 : null;
  const total = valid ? 2 ** (32 - prefixNumber) : null;
  const usable = total === null ? null : prefixNumber >= 31 ? total : Math.max(0, total - 2);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label htmlFor="subnet-ip" className="block text-xs font-medium text-muted-foreground">
          Indirizzo IPv4
          <input
            id="subnet-ip"
            inputMode="decimal"
            value={ip}
            onChange={(event) => setIp(event.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground"
          />
        </label>
        <NumberField
          id="subnet-prefix"
          label="Prefisso"
          unit="/"
          value={prefix}
          onChange={setPrefix}
          step="1"
        />
      </div>
      {valid ? (
        <dl className="grid grid-cols-2 gap-2">
          {[
            ["Maschera", numberToIp(mask!)],
            ["Indirizzo di rete", numberToIp(network!)],
            ["Broadcast", numberToIp(broadcast!)],
            ["Host utilizzabili", String(usable)],
          ].map(([label, result]) => (
            <div key={label} className="rounded-xl bg-surface p-3">
              <dt className="text-[10px] text-muted-foreground">{label}</dt>
              <dd className="mt-1 break-all font-mono text-sm font-semibold">{result}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Inserisci un IPv4 valido e un prefisso tra 0 e 32.
        </p>
      )}
    </div>
  );
}

function LogicGates() {
  const [gate, setGate] = useState("AND");
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const output = gate === "AND" ? a && b : gate === "OR" ? a || b : gate === "XOR" ? a !== b : !a;

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Porta logica
        <select
          aria-label="Porta logica"
          value={gate}
          onChange={(event) => setGate(event.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground"
        >
          <option>AND</option>
          <option>OR</option>
          <option>XOR</option>
          <option>NOT</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <Button variant={a ? "default" : "outline"} onClick={() => setA((current) => !current)}>
          Ingresso A: {a ? 1 : 0}
        </Button>
        {gate !== "NOT" && (
          <Button variant={b ? "default" : "outline"} onClick={() => setB((current) => !current)}>
            Ingresso B: {b ? 1 : 0}
          </Button>
        )}
      </div>
      <p
        role="status"
        aria-label={`Uscita: ${output ? 1 : 0}`}
        className="rounded-xl bg-primary-soft p-3 text-sm"
      >
        Uscita <strong className="font-mono">{output ? 1 : 0}</strong> · {output ? "HIGH" : "LOW"}
      </p>
      <p className="text-xs text-muted-foreground">
        Clicca gli ingressi per esercitarti e confronta l'uscita con la tabella di verità.
      </p>
    </div>
  );
}

function OhmsLaw() {
  const [unknown, setUnknown] = useState("voltage");
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const a = Number(first);
  const b = Number(second);
  const canCalculate = first !== "" && second !== "" && Number.isFinite(a) && Number.isFinite(b);
  let result: number | null = null;
  let resultLabel = "";
  let resultUnit = "";
  if (canCalculate) {
    if (unknown === "voltage") {
      result = a * b;
      resultLabel = "Tensione";
      resultUnit = "V";
    } else if (unknown === "current" && b !== 0) {
      result = a / b;
      resultLabel = "Corrente";
      resultUnit = "A";
    } else if (unknown === "resistance" && b !== 0) {
      result = a / b;
      resultLabel = "Resistenza";
      resultUnit = "Ω";
    }
  }
  const fields: [{ label: string; unit: string }, { label: string; unit: string }] =
    unknown === "voltage"
      ? [
          { label: "Corrente", unit: "A" },
          { label: "Resistenza", unit: "Ω" },
        ]
      : unknown === "current"
        ? [
            { label: "Tensione", unit: "V" },
            { label: "Resistenza", unit: "Ω" },
          ]
        : [
            { label: "Tensione", unit: "V" },
            { label: "Corrente", unit: "A" },
          ];

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Quale valore vuoi calcolare?
        <select
          aria-label="Valore da calcolare"
          value={unknown}
          onChange={(event) => {
            setUnknown(event.target.value);
            setFirst("");
            setSecond("");
          }}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground"
        >
          <option value="voltage">Tensione (V = I × R)</option>
          <option value="current">Corrente (I = V ÷ R)</option>
          <option value="resistance">Resistenza (R = V ÷ I)</option>
        </select>
      </label>
      <NumberField
        id="ohms-first"
        label={fields[0].label}
        unit={fields[0].unit}
        value={first}
        onChange={setFirst}
      />
      <NumberField
        id="ohms-second"
        label={fields[1].label}
        unit={fields[1].unit}
        value={second}
        onChange={setSecond}
      />
      {canCalculate && result !== null && Number.isFinite(result) ? (
        <p
          role="status"
          aria-label={`Risultato: ${resultLabel} ${Number(result.toPrecision(8))} ${resultUnit}`}
          className="rounded-xl bg-primary-soft p-3 text-sm"
        >
          {resultLabel}:{" "}
          <strong>
            {Number(result.toPrecision(8))} {resultUnit}
          </strong>
        </p>
      ) : canCalculate ? (
        <p role="alert" className="text-xs text-danger">
          I valori inseriti non permettono questo calcolo.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Inserisci i due valori noti per applicare la legge di Ohm.
        </p>
      )}
    </div>
  );
}

function RcTimeConstant() {
  const [resistance, setResistance] = useState("");
  const [capacitance, setCapacitance] = useState("");
  const r = Number(resistance);
  const c = Number(capacitance);
  const valid =
    resistance !== "" &&
    capacitance !== "" &&
    Number.isFinite(r) &&
    Number.isFinite(c) &&
    r >= 0 &&
    c >= 0;
  const seconds = valid ? r * c * 1e-6 : null;

  return (
    <div className="space-y-3">
      <NumberField
        id="rc-resistance"
        label="Resistenza"
        unit="Ω"
        value={resistance}
        onChange={setResistance}
      />
      <NumberField
        id="rc-capacitance"
        label="Capacità"
        unit="µF"
        value={capacitance}
        onChange={setCapacitance}
      />
      {valid ? (
        <div className="rounded-xl bg-primary-soft p-3 text-sm">
          <p>τ = R × C</p>
          <p className="mt-1 font-semibold">
            {Number((seconds! * 1000).toPrecision(8))} ms
            <span className="ml-2 font-normal text-muted-foreground">
              ({Number(seconds!.toPrecision(8))} s)
            </span>
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Inserisci resistenza e capacità per calcolare τ.
        </p>
      )}
    </div>
  );
}

function LedResistor() {
  const [supply, setSupply] = useState("5");
  const [forward, setForward] = useState("2");
  const [current, setCurrent] = useState("10");
  const v = Number(supply);
  const vf = Number(forward);
  const ma = Number(current);
  const valid = [v, vf, ma].every(Number.isFinite) && v > vf && ma > 0;
  const resistor = valid ? (v - vf) / (ma / 1000) : null;
  const power = valid ? (v - vf) * (ma / 1000) * 1000 : null;

  return (
    <div className="space-y-3">
      <NumberField
        id="led-supply"
        label="Alimentazione"
        unit="V"
        value={supply}
        onChange={setSupply}
      />
      <NumberField
        id="led-forward"
        label="Caduta diretta LED"
        unit="V"
        value={forward}
        onChange={setForward}
      />
      <NumberField
        id="led-current"
        label="Corrente desiderata"
        unit="mA"
        value={current}
        onChange={setCurrent}
      />
      {valid ? (
        <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm">
          Resistenza minima: <strong>{Number(resistor!.toPrecision(6))} Ω</strong>
          <br />
          <span className="text-xs text-muted-foreground">
            Potenza dissipata: {Number(power!.toPrecision(5))} mW · scegli un valore commerciale
            uguale o superiore.
          </span>
        </p>
      ) : (
        <p role="alert" className="text-xs text-danger">
          L'alimentazione deve superare la caduta del LED e la corrente deve essere positiva.
        </p>
      )}
    </div>
  );
}

function VoltageDivider() {
  const [input, setInput] = useState("12");
  const [r1, setR1] = useState("10000");
  const [r2, setR2] = useState("10000");
  const [vin, resistance1, resistance2] = [Number(input), Number(r1), Number(r2)] as const;
  const valid =
    [vin, resistance1, resistance2].every(Number.isFinite) &&
    vin >= 0 &&
    resistance1 > 0 &&
    resistance2 > 0;
  const output = valid ? (vin * resistance2) / (resistance1 + resistance2) : null;

  return (
    <div className="space-y-3">
      <NumberField
        id="divider-input"
        label="Tensione in ingresso"
        unit="V"
        value={input}
        onChange={setInput}
      />
      <div className="grid grid-cols-2 gap-2">
        <NumberField id="divider-r1" label="R1" unit="Ω" value={r1} onChange={setR1} />
        <NumberField id="divider-r2" label="R2" unit="Ω" value={r2} onChange={setR2} />
      </div>
      {valid ? (
        <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm">
          Tensione d'uscita: <strong>{Number(output!.toPrecision(6))} V</strong>
          <br />
          <span className="text-xs text-muted-foreground">Vout = Vin × R2 ÷ (R1 + R2)</span>
        </p>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Inserisci una tensione non negativa e due resistenze positive.
        </p>
      )}
    </div>
  );
}

const RESISTOR_BANDS = [
  ["nero", 0, "0 Ω"],
  ["marrone", 1, "1 kΩ"],
  ["rosso", 2, "2 kΩ"],
  ["arancione", 3, "3 kΩ"],
  ["giallo", 4, "4 kΩ"],
  ["verde", 5, "5 kΩ"],
  ["blu", 6, "6 kΩ"],
  ["viola", 7, "7 kΩ"],
  ["grigio", 8, "8 kΩ"],
  ["bianco", 9, "9 kΩ"],
] as const;

function ResistorCode() {
  const [first, setFirst] = useState("marrone");
  const [second, setSecond] = useState("nero");
  const [multiplier, setMultiplier] = useState("rosso");
  const [tolerance, setTolerance] = useState("5");
  const digit = (name: string) => RESISTOR_BANDS.find(([color]) => color === name)?.[1] ?? 0;
  const ohms = (digit(first) * 10 + digit(second)) * 10 ** digit(multiplier);
  const pretty =
    ohms >= 1_000_000 ? `${ohms / 1_000_000} MΩ` : ohms >= 1000 ? `${ohms / 1000} kΩ` : `${ohms} Ω`;
  return (
    <div className="space-y-3">
      {[
        ["Prima banda", first, setFirst],
        ["Seconda banda", second, setSecond],
        ["Moltiplicatore", multiplier, setMultiplier],
      ].map(([label, value, setter]) => (
        <label key={label as string} className="block text-xs font-medium text-muted-foreground">
          {label as string}
          <select
            aria-label={label as string}
            value={value as string}
            onChange={(event) => (setter as (value: string) => void)(event.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground"
          >
            {RESISTOR_BANDS.map(([color]) => (
              <option key={color}>{color}</option>
            ))}
          </select>
        </label>
      ))}
      <label className="block text-xs font-medium text-muted-foreground">
        Tolleranza
        <select
          aria-label="Tolleranza"
          value={tolerance}
          onChange={(event) => setTolerance(event.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground"
        >
          <option value="1">±1%</option>
          <option value="2">±2%</option>
          <option value="5">±5%</option>
          <option value="10">±10%</option>
        </select>
      </label>
      <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm">
        Valore nominale: <strong>{pretty}</strong>{" "}
        <span className="text-xs text-muted-foreground">(±{tolerance}%)</span>
      </p>
    </div>
  );
}

function GearRatio() {
  const [driver, setDriver] = useState("20");
  const [driven, setDriven] = useState("60");
  const [speed, setSpeed] = useState("1500");
  const ratio = Number(driven) / Number(driver);
  const valid = Number(driver) > 0 && Number(driven) > 0 && Number(speed) >= 0;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          id="gear-driver"
          label="Denti motrice"
          value={driver}
          onChange={setDriver}
          step="1"
        />
        <NumberField
          id="gear-driven"
          label="Denti condotta"
          value={driven}
          onChange={setDriven}
          step="1"
        />
      </div>
      <NumberField
        id="gear-speed"
        label="Velocità motrice"
        unit="rpm"
        value={speed}
        onChange={setSpeed}
      />
      {valid ? (
        <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm">
          Rapporto: <strong>{ratio.toFixed(2)}:1</strong>
          <br />
          Velocità condotta: <strong>{(Number(speed) / ratio).toFixed(1)} rpm</strong>
        </p>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Inserisci valori positivi per denti e velocità.
        </p>
      )}
    </div>
  );
}

function TorquePower() {
  const [torque, setTorque] = useState("12");
  const [rpm, setRpm] = useState("1500");
  const valid = Number(torque) >= 0 && Number(rpm) >= 0;
  const power = valid ? (2 * Math.PI * Number(rpm) * Number(torque)) / 60 : null;
  return (
    <div className="space-y-3">
      <NumberField
        id="torque-value"
        label="Coppia"
        unit="N·m"
        value={torque}
        onChange={setTorque}
      />
      <NumberField id="torque-rpm" label="Velocità" unit="rpm" value={rpm} onChange={setRpm} />
      {valid ? (
        <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm">
          Potenza meccanica: <strong>{(power! / 1000).toFixed(3)} kW</strong>
          <br />
          <span className="text-xs text-muted-foreground">P = 2π × n × M ÷ 60</span>
        </p>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Inserisci coppia e velocità non negative.
        </p>
      )}
    </div>
  );
}

function ColorConverter() {
  const [red, setRed] = useState("52");
  const [green, setGreen] = useState("152");
  const [blue, setBlue] = useState("219");
  const channels = [Number(red), Number(green), Number(blue)];
  const valid = channels.every((value) => Number.isInteger(value) && value >= 0 && value <= 255);
  const hex = valid
    ? `#${channels
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()}`
    : "";
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <NumberField id="color-red" label="Rosso" value={red} onChange={setRed} step="1" />
        <NumberField id="color-green" label="Verde" value={green} onChange={setGreen} step="1" />
        <NumberField id="color-blue" label="Blu" value={blue} onChange={setBlue} step="1" />
      </div>
      {valid ? (
        <div
          role="status"
          className="rounded-xl p-4 text-sm"
          style={{
            backgroundColor: hex,
            color: channels.reduce((a, b) => a + b, 0) > 380 ? "#111" : "#fff",
          }}
        >
          <strong>{hex}</strong>
          <br />
          <span className="text-xs">rgb({channels.join(", ")})</span>
        </div>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Ogni canale deve essere un intero tra 0 e 255.
        </p>
      )}
    </div>
  );
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function AspectRatio() {
  const [width, setWidth] = useState("1920");
  const [height, setHeight] = useState("1080");
  const w = Number(width);
  const h = Number(height);
  const valid = Number.isInteger(w) && Number.isInteger(h) && w > 0 && h > 0;
  const divisor = valid ? gcd(w, h) : 1;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          id="aspect-width"
          label="Larghezza"
          unit="px"
          value={width}
          onChange={setWidth}
          step="1"
        />
        <NumberField
          id="aspect-height"
          label="Altezza"
          unit="px"
          value={height}
          onChange={setHeight}
          step="1"
        />
      </div>
      {valid ? (
        <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm">
          Formato:{" "}
          <strong>
            {w / divisor}:{h / divisor}
          </strong>
          <br />
          Rapporto: <strong>{(w / h).toFixed(3)}:1</strong>
        </p>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Inserisci due dimensioni intere positive.
        </p>
      )}
    </div>
  );
}

function PercentageCalculator() {
  const [amount, setAmount] = useState("100");
  const [rate, setRate] = useState("20");
  const value = Number(amount);
  const percent = Number(rate);
  const valid = Number.isFinite(value) && Number.isFinite(percent) && value >= 0;
  return (
    <div className="space-y-3">
      <NumberField
        id="percentage-amount"
        label="Importo"
        unit="€"
        value={amount}
        onChange={setAmount}
      />
      <NumberField
        id="percentage-rate"
        label="Percentuale"
        unit="%"
        value={rate}
        onChange={setRate}
      />
      {valid ? (
        <dl className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-[10px] text-muted-foreground">Percentuale</dt>
            <dd className="font-semibold">{((value * percent) / 100).toFixed(2)} €</dd>
          </div>
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-[10px] text-muted-foreground">Totale con aumento</dt>
            <dd className="font-semibold">{(value * (1 + percent / 100)).toFixed(2)} €</dd>
          </div>
        </dl>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Inserisci valori numerici validi.
        </p>
      )}
    </div>
  );
}

function IvaCalculator() {
  const [amount, setAmount] = useState("100");
  const [rate, setRate] = useState("22");
  const imponibile = Number(amount);
  const iva = Number(rate);
  const valid = imponibile >= 0 && iva >= 0;
  return (
    <div className="space-y-3">
      <NumberField
        id="iva-amount"
        label="Imponibile"
        unit="€"
        value={amount}
        onChange={setAmount}
      />
      <NumberField id="iva-rate" label="Aliquota" unit="%" value={rate} onChange={setRate} />
      {valid ? (
        <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm">
          IVA: <strong>{((imponibile * iva) / 100).toFixed(2)} €</strong>
          <br />
          Totale: <strong>{(imponibile * (1 + iva / 100)).toFixed(2)} €</strong>
        </p>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Inserisci imponibile e aliquota non negativi.
        </p>
      )}
    </div>
  );
}

function BreakEven() {
  const [fixed, setFixed] = useState("10000");
  const [price, setPrice] = useState("50");
  const [variable, setVariable] = useState("20");
  const units = Number(fixed) / (Number(price) - Number(variable));
  const valid = Number(fixed) >= 0 && Number(price) > Number(variable);
  return (
    <div className="space-y-3">
      <NumberField
        id="breakeven-fixed"
        label="Costi fissi"
        unit="€"
        value={fixed}
        onChange={setFixed}
      />
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          id="breakeven-price"
          label="Prezzo unitario"
          unit="€"
          value={price}
          onChange={setPrice}
        />
        <NumberField
          id="breakeven-variable"
          label="Costo variabile"
          unit="€"
          value={variable}
          onChange={setVariable}
        />
      </div>
      {valid ? (
        <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm">
          Punto di pareggio: <strong>{Math.ceil(units)} unità</strong>
          <br />
          <span className="text-xs text-muted-foreground">
            Margine unitario: {(Number(price) - Number(variable)).toFixed(2)} €
          </span>
        </p>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Il prezzo deve essere maggiore del costo variabile.
        </p>
      )}
    </div>
  );
}

function TravelBudget() {
  const [people, setPeople] = useState("2");
  const [transport, setTransport] = useState("120");
  const [stay, setStay] = useState("360");
  const [days, setDays] = useState("3");
  const total = Number(transport) + Number(stay) + Number(days) * 40;
  const valid = Number(people) > 0 && total >= 0;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          id="travel-people"
          label="Partecipanti"
          value={people}
          onChange={setPeople}
          step="1"
        />
        <NumberField id="travel-days" label="Giorni" value={days} onChange={setDays} step="1" />
      </div>
      <NumberField
        id="travel-transport"
        label="Trasporti"
        unit="€"
        value={transport}
        onChange={setTransport}
      />
      <NumberField id="travel-stay" label="Alloggio" unit="€" value={stay} onChange={setStay} />
      {valid ? (
        <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm">
          Budget stimato: <strong>{total.toFixed(2)} €</strong>
          <br />
          Quota per persona: <strong>{(total / Number(people)).toFixed(2)} €</strong>
        </p>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Inserisci partecipanti e valori validi.
        </p>
      )}
    </div>
  );
}

function ExchangeConverter() {
  const [amount, setAmount] = useState("100");
  const [rate, setRate] = useState("1.08");
  const valid = Number(amount) >= 0 && Number(rate) > 0;
  return (
    <div className="space-y-3">
      <NumberField
        id="exchange-amount"
        label="Importo di partenza"
        value={amount}
        onChange={setAmount}
      />
      <NumberField id="exchange-rate" label="Tasso applicato" value={rate} onChange={setRate} />
      {valid ? (
        <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm">
          Importo convertito: <strong>{(Number(amount) * Number(rate)).toFixed(2)}</strong>
          <br />
          <span className="text-xs text-muted-foreground">
            Tasso inserito manualmente: nessun dato online.
          </span>
        </p>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Inserisci importo positivo e tasso maggiore di zero.
        </p>
      )}
    </div>
  );
}

function PrintResolution() {
  const [cm, setCm] = useState("21");
  const [dpi, setDpi] = useState("300");
  const px = (Number(cm) / 2.54) * Number(dpi);
  const valid = Number(cm) > 0 && Number(dpi) > 0;
  return (
    <div className="space-y-3">
      <NumberField id="print-cm" label="Lato di stampa" unit="cm" value={cm} onChange={setCm} />
      <NumberField id="print-dpi" label="Risoluzione" unit="DPI" value={dpi} onChange={setDpi} />
      {valid ? (
        <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm">
          Pixel necessari: <strong>{Math.round(px)} px</strong>
          <br />
          <span className="text-xs text-muted-foreground">1 pollice = 2,54 cm</span>
        </p>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Inserisci dimensione e DPI positivi.
        </p>
      )}
    </div>
  );
}

function ToolContent({ id }: { id: ToolId }) {
  if (id === "base-converter") return <BaseConverter />;
  if (id === "binary-calculator") return <BinaryCalculator />;
  if (id === "ascii-table") return <AsciiTable />;
  if (id === "subnet-calculator") return <SubnetCalculator />;
  if (id === "logic-gates") return <LogicGates />;
  if (id === "ohms-law") return <OhmsLaw />;
  if (id === "rc-time") return <RcTimeConstant />;
  if (id === "led-resistor") return <LedResistor />;
  if (id === "voltage-divider") return <VoltageDivider />;
  if (id === "gear-ratio") return <GearRatio />;
  if (id === "torque-power") return <TorquePower />;
  if (id === "color-converter") return <ColorConverter />;
  if (id === "aspect-ratio") return <AspectRatio />;
  if (id === "travel-budget") return <TravelBudget />;
  if (id === "exchange-converter") return <ExchangeConverter />;
  if (id === "iva-calculator") return <IvaCalculator />;
  if (id === "break-even") return <BreakEven />;
  if (id === "print-resolution") return <PrintResolution />;
  if (id === "percentage-calculator") return <PercentageCalculator />;
  return <ResistorCode />;
}

type SchoolId = "morselli-sturzo" | "majorana" | "vittorini" | "altri";

const SCHOOL_KEY = "voto.study-tools-shop.school.v1";
const FAVORITE_SCHOOLS_KEY = "voto.study-tools-shop.favorite-schools.v1";
const FAVORITE_TRACKS_KEY = "voto.study-tools-shop.favorite-tracks.v1";

const SCHOOL_LABELS: Record<SchoolId, string> = {
  "morselli-sturzo": "IIS E. Morselli - L. Sturzo",
  majorana: "IIS E. Majorana",
  vittorini: 'Liceo Scientifico e Linguistico "E. Vittorini"',
  altri: "Altri indirizzi",
};

const SCHOOL_TRACKS: Record<SchoolId, Track[]> = {
  "morselli-sturzo": [
    "agraria",
    "viticoltura",
    "informatica",
    "elettronica",
    "meccatronica",
    "chimica",
    "biotecnologie",
    "turismo",
    "afm",
    "rim",
    "sia",
    "enogastronomia",
    "sala-vendita",
    "accoglienza",
  ],
  majorana: [
    "cat",
    "nautico",
    "aeronautico",
    "artistico",
    "moda",
    "audiovisivo",
    "manutenzione",
    "made-italy",
    "odontotecnico",
  ],
  vittorini: [
    "scientifico-vittorini",
    "linguistico-vittorini",
    "scienze-applicate-vittorini",
    "tred-vittorini",
    "biomedica-vittorini",
  ],
  altri: ["grafica"],
};

function readStringArray(key: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "null");
    return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
  } catch {
    return [];
  }
}

function isTrackInSchool(school: SchoolId | null, value: string): value is Track {
  return school !== null && SCHOOL_TRACKS[school].includes(value as Track);
}

export function StudyToolsShop() {
  const [school, setSchool] = useState<SchoolId | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [openTool, setOpenTool] = useState<ToolId | null>(null);
  const [search, setSearch] = useState("");
  const [favoriteSchools, setFavoriteSchools] = useState<SchoolId[]>([]);
  const [favoriteTracks, setFavoriteTracks] = useState<Track[]>([]);

  useEffect(() => {
    try {
      const savedSchools = readStringArray(FAVORITE_SCHOOLS_KEY).filter(
        (value): value is SchoolId => value in SCHOOL_LABELS,
      );
      const savedTracks = readStringArray(FAVORITE_TRACKS_KEY).filter(
        (value): value is Track => value in TRACK_LABELS,
      );
      const savedSchool = localStorage.getItem(SCHOOL_KEY);
      const preferredSchool =
        savedSchool && savedSchool in SCHOOL_LABELS ? (savedSchool as SchoolId) : null;
      const quickSchool = savedSchools[0] ?? preferredSchool;
      const quickTrack = savedTracks.find((value) => isTrackInSchool(quickSchool, value));
      setFavoriteSchools(savedSchools);
      setFavoriteTracks(savedTracks);
      if (quickSchool) {
        setSchool(quickSchool);
        if (quickTrack) setTrack(quickTrack);
      }
    } catch {
      // Il negozio resta utilizzabile anche se lo storage non è accessibile.
    }
  }, []);

  function persistList(key: string, values: string[]) {
    try {
      localStorage.setItem(key, JSON.stringify(values));
    } catch {
      // Il preferito resta valido nella sessione corrente.
    }
  }

  function toggleSchoolFavorite(value: SchoolId) {
    const next = favoriteSchools.includes(value)
      ? favoriteSchools.filter((item) => item !== value)
      : [...favoriteSchools, value];
    setFavoriteSchools(next);
    persistList(FAVORITE_SCHOOLS_KEY, next);
  }

  function toggleTrackFavorite(value: Track) {
    const next = favoriteTracks.includes(value)
      ? favoriteTracks.filter((item) => item !== value)
      : [...favoriteTracks, value];
    setFavoriteTracks(next);
    persistList(FAVORITE_TRACKS_KEY, next);
  }

  function chooseSchool(nextSchool: SchoolId) {
    setSchool(nextSchool);
    setTrack(null);
    setOpenTool(null);
    setSearch("");
    try {
      localStorage.setItem(SCHOOL_KEY, nextSchool);
    } catch {
      // La selezione vale comunque per la sessione corrente.
    }
  }

  function chooseTrack(nextTrack: Track) {
    setTrack(nextTrack);
    setOpenTool(null);
    setSearch("");
    try {
      localStorage.setItem(TRACK_KEY, nextTrack);
    } catch {
      // La selezione vale comunque per la sessione corrente.
    }
  }

  const filteredTools = useMemo(() => {
    if (!track) return [];
    const query = search.trim().toLocaleLowerCase("it-IT");
    return TOOLS.filter((tool) => {
      const matchesTrack = tool.track === track;
      const matchesSearch =
        !query ||
        `${tool.title} ${tool.description} ${tool.label}`
          .toLocaleLowerCase("it-IT")
          .includes(query);
      return matchesTrack && matchesSearch;
    });
  }, [search, track]);
  const selectedTool = TOOLS.find(
    ({ id, track: toolTrack }) => id === openTool && toolTrack === track,
  );

  return (
    <div className="space-y-4">
      {openTool && selectedTool ? (
        <>
          <Button variant="ghost" size="sm" onClick={() => setOpenTool(null)} className="pl-0">
            <ArrowLeft /> Torna agli strumenti
          </Button>
          <section className="card-surface space-y-4 p-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                {school ? SCHOOL_LABELS[school] : "Negozio strumenti"} ·{" "}
                {TRACK_LABELS[selectedTool.track]}
              </p>
              <h2 className="mt-1 font-display text-2xl font-semibold">{selectedTool.title}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {selectedTool.description}
              </p>
            </div>
            <ToolContent id={openTool} />
          </section>
        </>
      ) : !school ? (
        <>
          <section className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-soft/70 via-card to-card p-4 shadow-sm">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              <CircuitBoard className="h-3.5 w-3.5" /> Prima scegli la scuola
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold">Negozio strumenti</h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Scegli la scuola, poi l’indirizzo. Usa la stella per ritrovare subito i tuoi
              preferiti.
            </p>
          </section>
          <section aria-label="Scuole" className="space-y-2">
            <p className="text-xs font-semibold">Scegli la scuola</p>
            {Object.keys(SCHOOL_LABELS).map((item) => {
              const schoolId = item as SchoolId;
              const favorite = favoriteSchools.includes(schoolId);
              return (
                <div key={schoolId} className="card-surface flex items-center gap-2 p-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => chooseSchool(schoolId)}
                  >
                    <span className="block text-sm font-semibold">{SCHOOL_LABELS[schoolId]}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {SCHOOL_TRACKS[schoolId].length} indirizzi disponibili
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`${favorite ? "Rimuovi" : "Aggiungi"} scuola preferita: ${SCHOOL_LABELS[schoolId]}`}
                    title={
                      favorite ? "Rimuovi scuola dai preferiti" : "Aggiungi scuola ai preferiti"
                    }
                    onClick={() => toggleSchoolFavorite(schoolId)}
                    className="rounded-xl p-2 text-primary hover:bg-primary-soft"
                  >
                    <Star className="h-5 w-5" fill={favorite ? "currentColor" : "none"} />
                  </button>
                </div>
              );
            })}
          </section>
        </>
      ) : !track ? (
        <>
          <Button variant="ghost" size="sm" onClick={() => setSchool(null)} className="pl-0">
            <ArrowLeft /> Cambia scuola
          </Button>
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                  Scuola selezionata
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold">{SCHOOL_LABELS[school]}</h2>
              </div>
              <button
                type="button"
                aria-label={`${favoriteSchools.includes(school) ? "Rimuovi" : "Aggiungi"} scuola preferita: ${SCHOOL_LABELS[school]}`}
                onClick={() => toggleSchoolFavorite(school)}
                className="rounded-xl p-2 text-primary hover:bg-primary-soft"
              >
                <Star
                  className="h-5 w-5"
                  fill={favoriteSchools.includes(school) ? "currentColor" : "none"}
                />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Ora scegli l’indirizzo di studio.</p>
            <div role="group" aria-label="Indirizzi della scuola" className="space-y-2">
              {SCHOOL_TRACKS[school].map((item) => {
                const favorite = favoriteTracks.includes(item);
                return (
                  <div key={item} className="card-surface flex items-center gap-2 p-3">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => chooseTrack(item)}
                    >
                      <span className="block text-sm font-semibold">{TRACK_LABELS[item]}</span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        Apri il catalogo dedicato
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`${favorite ? "Rimuovi" : "Aggiungi"} indirizzo preferito: ${TRACK_LABELS[item]}`}
                      title={
                        favorite
                          ? "Rimuovi indirizzo dai preferiti"
                          : "Aggiungi indirizzo ai preferiti"
                      }
                      onClick={() => toggleTrackFavorite(item)}
                      className="rounded-xl p-2 text-primary hover:bg-primary-soft"
                    >
                      <Star className="h-5 w-5" fill={favorite ? "currentColor" : "none"} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => setTrack(null)} className="pl-0">
              <ArrowLeft /> Cambia indirizzo
            </Button>
            <button
              type="button"
              aria-label={`${favoriteTracks.includes(track) ? "Rimuovi" : "Aggiungi"} indirizzo preferito: ${TRACK_LABELS[track]}`}
              onClick={() => toggleTrackFavorite(track)}
              className="rounded-xl p-2 text-primary hover:bg-primary-soft"
            >
              <Star
                className="h-5 w-5"
                fill={favoriteTracks.includes(track) ? "currentColor" : "none"}
              />
            </button>
          </div>
          <section className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-soft/70 via-card to-card p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              {SCHOOL_LABELS[school]}
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold">{TRACK_LABELS[track]}</h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Strumenti pratici per il tuo indirizzo.
            </p>
          </section>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              aria-label="Cerca nel catalogo"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cerca uno strumento…"
              className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <section aria-label={`Strumenti di ${TRACK_LABELS[track]}`} className="space-y-2">
            {filteredTools.length ? (
              filteredTools.map(({ id, title, description, icon: Icon, label }) => (
                <article
                  key={`${id}-${title}`}
                  className="card-surface flex items-center gap-3 p-3.5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold">{title}</h3>
                    <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{description}</p>
                    <p className="mt-1 text-[10px] font-medium text-primary/80">
                      {label} · Incluso
                    </p>
                  </div>
                  <Button size="sm" aria-label={`Apri ${title}`} onClick={() => setOpenTool(id)}>
                    Apri
                  </Button>
                </article>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Nessuno strumento corrisponde alla ricerca.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
