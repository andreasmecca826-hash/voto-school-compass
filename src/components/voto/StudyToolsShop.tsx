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
  ShieldCheck,
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
  | "biomedica-vittorini"
  | "classico-eschilo"
  | "scienze-umane-eschilo"
  | "economico-sociale-eschilo";
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
  | "percentage-calculator"
  | "molarity-lab"
  | "ph-lab"
  | "statistics-lab"
  | "route-planner"
  | "food-cost"
  | "ledger-cashflow"
  | "sql-schema"
  | "agronomy-lab"
  | "plc-troubleshooter"
  | "language-cards"
  | "creative-planner"
  | "web-lab"
  | "code-lab"
  | "sql-lab"
  | "math-lab"
  | "electronics-lab"
  | "signal-lab"
  | "automation-lab"
  | "chemistry-lab"
  | "biotech-lab"
  | "physics-lab"
  | "waves-optics-lab"
  | "business-lab"
  | "inventory-lab"
  | "hospitality-lab"
  | "travel-itinerary-lab"
  | "geo-survey-lab"
  | "navigation-lab"
  | "language-classics-lab"
  | "language-practice-lab"
  | "design-lab"
  | "media-storyboard-lab"
  | "fashion-lab"
  | "dental-materials-lab"
  | "social-research-lab"
  | "viticulture-traceability-lab"
  | "safety-lab";

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

  {
    id: "ascii-table",
    title: "Laboratorio di testi classici",
    description: "Esplora caratteri e codici per testi, citazioni e documenti digitali.",
    track: "classico-eschilo",
    icon: Sigma,
    label: "Lingue classiche e digitale",
  },
  {
    id: "percentage-calculator",
    title: "Percentuali e dati storici",
    description: "Calcola variazioni e percentuali per esercizi di storia e attualità.",
    track: "classico-eschilo",
    icon: Gauge,
    label: "Matematica e storia",
  },
  {
    id: "aspect-ratio",
    title: "Proporzioni per elaborati",
    description: "Ridimensiona schemi e materiali per presentazioni e tesine.",
    track: "classico-eschilo",
    icon: Activity,
    label: "Comunicazione",
  },
  {
    id: "print-resolution",
    title: "Stampa di tavole e tesine",
    description: "Calcola pixel e DPI per preparare elaborati e portfolio.",
    track: "classico-eschilo",
    icon: Search,
    label: "Produzione digitale",
  },
  {
    id: "percentage-calculator",
    title: "Percentuali sociali",
    description: "Analizza percentuali e variazioni in fenomeni sociali e demografici.",
    track: "scienze-umane-eschilo",
    icon: Gauge,
    label: "Scienze umane",
  },
  {
    id: "travel-budget",
    title: "Budget per attività didattiche",
    description: "Organizza costi, partecipanti e quote per uscite e progetti.",
    track: "scienze-umane-eschilo",
    icon: Globe,
    label: "Organizzazione",
  },
  {
    id: "aspect-ratio",
    title: "Proporzioni per mappe concettuali",
    description: "Mantieni rapporti e formati per schemi e presentazioni.",
    track: "scienze-umane-eschilo",
    icon: Activity,
    label: "Metodologia",
  },
  {
    id: "ascii-table",
    title: "Codifica dei questionari",
    description: "Converti caratteri e codici per organizzare dati e questionari.",
    track: "scienze-umane-eschilo",
    icon: Sigma,
    label: "Ricerca sociale",
  },
  {
    id: "iva-calculator",
    title: "IVA e prezzi",
    description: "Calcola imponibile, IVA e totale nelle attività economiche.",
    track: "economico-sociale-eschilo",
    icon: Sigma,
    label: "Diritto ed economia",
  },
  {
    id: "percentage-calculator",
    title: "Indicatori economici",
    description: "Calcola variazioni, percentuali e indicatori per l’analisi economica.",
    track: "economico-sociale-eschilo",
    icon: Gauge,
    label: "Economia",
  },
  {
    id: "exchange-converter",
    title: "Cambio valuta",
    description: "Confronta importi e tassi per esercizi di economia internazionale.",
    track: "economico-sociale-eschilo",
    icon: Sigma,
    label: "Scambi internazionali",
  },
  {
    id: "break-even",
    title: "Punto di pareggio",
    description: "Trova le unità necessarie per coprire costi fissi e variabili.",
    track: "economico-sociale-eschilo",
    icon: GitBranch,
    label: "Gestione aziendale",
  },
];

const FIRST_BLOCK_TOOLS: ShopTool[] = [
  {
    id: "web-lab",
    title: "Laboratorio web HTML/CSS",
    description:
      "Scrivi HTML e CSS e osserva un’anteprima locale in iframe sandboxato, senza script eseguiti.",
    track: "informatica",
    icon: Globe,
    label: "Web design",
  },
  {
    id: "code-lab",
    title: "Laboratorio JavaScript e pseudocodice",
    description:
      "Segui esempi guidati e ottieni output locale con esercizi predefiniti, senza eval non controllato.",
    track: "informatica",
    icon: Cpu,
    label: "Programmazione",
  },
  {
    id: "sql-lab",
    title: "Laboratorio SQL interattivo",
    description: "Esplora schema, SELECT e risultati su un piccolo dataset didattico fisso.",
    track: "informatica",
    icon: Network,
    label: "Basi di dati",
  },
  {
    id: "web-lab",
    title: "Laboratorio web per grafica",
    description: "Prototipa una composizione HTML/CSS in anteprima locale e sandboxata.",
    track: "grafica",
    icon: Globe,
    label: "Web design",
  },
  {
    id: "code-lab",
    title: "Laboratorio JavaScript per dati",
    description: "Esercizi guidati di logica e manipolazione dati con output locale sicuro.",
    track: "grafica",
    icon: Cpu,
    label: "Interattività",
  },
  {
    id: "web-lab",
    title: "Laboratorio web aziendale",
    description: "Crea una piccola interfaccia HTML/CSS per sistemi informativi.",
    track: "sia",
    icon: Globe,
    label: "Web design",
  },
  {
    id: "code-lab",
    title: "Laboratorio JavaScript aziendale",
    description: "Impara condizioni e cicli con esempi guidati e output locale limitato.",
    track: "sia",
    icon: Cpu,
    label: "Programmazione",
  },
  {
    id: "sql-lab",
    title: "Laboratorio SQL aziendale",
    description: "Interroga un dataset clienti e ordini con SELECT didattiche sicure.",
    track: "sia",
    icon: Network,
    label: "Basi di dati",
  },
  {
    id: "math-lab",
    title: "Laboratorio equazioni e funzioni",
    description:
      "Risolvi equazioni lineari e quadratiche e visualizza tabella e grafico della funzione.",
    track: "scientifico-vittorini",
    icon: Sigma,
    label: "Matematica",
  },
  {
    id: "math-lab",
    title: "Laboratorio matematico applicato",
    description: "Studia radici e andamento di una funzione con calcolo locale e grafico semplice.",
    track: "scienze-applicate-vittorini",
    icon: Sigma,
    label: "Matematica",
  },
  {
    id: "web-lab",
    title: "Laboratorio web e prototipi",
    description: "Progetta una pagina HTML/CSS e visualizzala in un’anteprima isolata.",
    track: "scienze-applicate-vittorini",
    icon: Globe,
    label: "Tecnologie web",
  },
  {
    id: "code-lab",
    title: "Laboratorio JavaScript e algoritmi",
    description: "Esercizi guidati di algoritmi con output deterministico nel browser.",
    track: "scienze-applicate-vittorini",
    icon: Cpu,
    label: "Algoritmi",
  },
  {
    id: "sql-lab",
    title: "Laboratorio SQL e dati",
    description: "Sperimenta query SELECT su dati fissi senza collegamenti a database remoti.",
    track: "scienze-applicate-vittorini",
    icon: Network,
    label: "Dati",
  },
  {
    id: "math-lab",
    title: "Laboratorio funzioni TRED",
    description:
      "Risolvi equazioni e osserva i valori di una funzione in una tabella e in un grafico.",
    track: "tred-vittorini",
    icon: Sigma,
    label: "Modelli matematici",
  },
  {
    id: "web-lab",
    title: "Laboratorio web TRED",
    description: "Realizza un prototipo HTML/CSS con anteprima isolata e sicura.",
    track: "tred-vittorini",
    icon: Globe,
    label: "Transizione digitale",
  },
  {
    id: "code-lab",
    title: "Laboratorio codice TRED",
    description: "Allenati con esempi di JavaScript e pseudocodice senza esecuzione arbitraria.",
    track: "tred-vittorini",
    icon: Cpu,
    label: "Programmazione",
  },
  {
    id: "sql-lab",
    title: "Laboratorio SQL TRED",
    description: "Costruisci SELECT guidate su un dataset locale di esempio.",
    track: "tred-vittorini",
    icon: Network,
    label: "Dati digitali",
  },
];

const EXTRA_TOOLS: ShopTool[] = [
  {
    id: "molarity-lab",
    title: "Laboratorio molarità e diluizioni",
    description: "Prepara una soluzione e applica C₁V₁ = C₂V₂ con controllo delle unità.",
    track: "chimica",
    icon: Sigma,
    label: "Chimica quantitativa",
  },
  {
    id: "ph-lab",
    title: "Laboratorio pH",
    description: "Stima il pH di acidi e basi forti e osserva la scala logaritmica.",
    track: "chimica",
    icon: Activity,
    label: "Acidi e basi",
  },
  {
    id: "molarity-lab",
    title: "Diluizioni per biotecnologie",
    description: "Calcola stock, volume finale e aliquota per un protocollo di laboratorio.",
    track: "biotecnologie",
    icon: Sigma,
    label: "Protocolli",
  },
  {
    id: "ph-lab",
    title: "pH e biosicurezza",
    description: "Collega concentrazione e pH nella preparazione di campioni biologici.",
    track: "biotecnologie",
    icon: Activity,
    label: "Laboratorio",
  },
  {
    id: "statistics-lab",
    title: "Statistica descrittiva e regressione",
    description: "Inserisci dati separati da virgola e ricava media, mediana, deviazione e retta.",
    track: "scientifico-vittorini",
    icon: Sigma,
    label: "Dati e modelli",
  },
  {
    id: "statistics-lab",
    title: "Statistica per scienze umane",
    description: "Esplora distribuzioni, percentuali e relazione lineare tra due variabili.",
    track: "scienze-umane-eschilo",
    icon: Sigma,
    label: "Ricerca sociale",
  },
  {
    id: "statistics-lab",
    title: "Indicatori e regressione",
    description: "Calcola percentuali e tendenza lineare per fenomeni economico-sociali.",
    track: "economico-sociale-eschilo",
    icon: Sigma,
    label: "Economia",
  },
  {
    id: "statistics-lab",
    title: "Percentuali e regressione",
    description: "Analizza risultati sperimentali e variazioni percentuali.",
    track: "linguistico-vittorini",
    icon: Sigma,
    label: "Analisi dati",
  },
  {
    id: "route-planner",
    title: "Distanza, rotta ed ETA",
    description: "Calcola distanza tra coordinate, bearing iniziale e tempo stimato.",
    track: "cat",
    icon: Globe,
    label: "Topografia",
  },
  {
    id: "route-planner",
    title: "Rotta nautica ed ETA",
    description: "Simula una tratta con coordinate, velocità e prua teorica.",
    track: "nautico",
    icon: Globe,
    label: "Navigazione",
  },
  {
    id: "route-planner",
    title: "Rotta aeronautica ed ETA",
    description: "Stima distanza ortodromica semplificata e durata del volo.",
    track: "aeronautico",
    icon: Globe,
    label: "Pianificazione volo",
  },
  {
    id: "route-planner",
    title: "Itinerario e tempi",
    description: "Calcola tappa, direzione e arrivo per un percorso turistico.",
    track: "turismo",
    icon: Globe,
    label: "Itinerari",
  },
  {
    id: "route-planner",
    title: "Itinerario per accoglienza",
    description: "Prepara una tappa con distanza, rotta e durata per il cliente.",
    track: "accoglienza",
    icon: Globe,
    label: "Guest experience",
  },
  {
    id: "food-cost",
    title: "Food cost e porzioni",
    description: "Somma ingredienti, porzioni e margine per definire il prezzo del piatto.",
    track: "enogastronomia",
    icon: Gauge,
    label: "Food cost",
  },
  {
    id: "food-cost",
    title: "Food cost del servizio",
    description: "Stima costo per coperto, ricarico e resa della ricetta.",
    track: "sala-vendita",
    icon: Gauge,
    label: "Servizio",
  },
  {
    id: "food-cost",
    title: "Checklist HACCP",
    description: "Segna i controlli essenziali di ricezione, conservazione e servizio.",
    track: "accoglienza",
    icon: Gauge,
    label: "Qualità",
  },
  {
    id: "safety-lab",
    title: "Safety lab cucina e HACCP",
    description:
      "Checklist locale per igiene, allergeni, temperature e organizzazione del servizio.",
    track: "enogastronomia",
    icon: ShieldCheck,
    label: "Sicurezza alimentare",
  },
  {
    id: "safety-lab",
    title: "Safety lab servizio e HACCP",
    description:
      "Checklist locale per igiene, allergeni, temperature e organizzazione del servizio.",
    track: "sala-vendita",
    icon: ShieldCheck,
    label: "Sicurezza alimentare",
  },
  {
    id: "ledger-cashflow",
    title: "Partita doppia e cash-flow",
    description: "Registra entrate e uscite e osserva il saldo progressivo.",
    track: "afm",
    icon: Activity,
    label: "Contabilità",
  },
  {
    id: "ledger-cashflow",
    title: "Cash-flow internazionale",
    description: "Simula incassi e pagamenti per una commessa estera.",
    track: "rim",
    icon: Activity,
    label: "Finanza",
  },
  {
    id: "ledger-cashflow",
    title: "Bilancio di progetto",
    description: "Confronta dare/avere e saldo per un progetto informativo.",
    track: "sia",
    icon: Activity,
    label: "Gestione",
  },
  {
    id: "sql-schema",
    title: "Schema database e SQL",
    description: "Definisci tabelle, chiavi e genera una query SELECT didattica.",
    track: "sia",
    icon: Network,
    label: "Basi di dati",
  },
  {
    id: "sql-schema",
    title: "Dati aziendali e SQL",
    description: "Progetta una tabella clienti e una query per il marketing.",
    track: "afm",
    icon: Network,
    label: "Sistemi informativi",
  },
  {
    id: "sql-schema",
    title: "CRM e query export",
    description: "Modella clienti e ordini per una relazione internazionale.",
    track: "rim",
    icon: Network,
    label: "CRM",
  },
  {
    id: "agronomy-lab",
    title: "Bilancio idrico e rese",
    description: "Stima fabbisogno irriguo, resa e produzione da superficie e input.",
    track: "agraria",
    icon: Activity,
    label: "Produzioni",
  },
  {
    id: "agronomy-lab",
    title: "Fermentazione base",
    description: "Simula zuccheri, resa teorica e avanzamento della fermentazione.",
    track: "viticoltura",
    icon: Activity,
    label: "Enologia",
  },
  {
    id: "plc-troubleshooter",
    title: "PLC: verità e troubleshooting",
    description: "Prova ingressi, uscita e diagnosi di tre guasti tipici.",
    track: "meccatronica",
    icon: GitBranch,
    label: "Automazione",
  },
  {
    id: "plc-troubleshooter",
    title: "Diagnostica manutenzione",
    description: "Segui una checklist interattiva per isolare un guasto di macchina.",
    track: "manutenzione",
    icon: GitBranch,
    label: "Troubleshooting",
  },
  {
    id: "language-cards",
    title: "Flashcard e traduzione guidata",
    description: "Ripassa lessico e costruisci una traduzione scegliendo il registro.",
    track: "linguistico-vittorini",
    icon: Globe,
    label: "Lingue",
  },
  {
    id: "language-cards",
    title: "Lessico latino e traduzione",
    description: "Ripassa forme e lessico con una traccia guidata di traduzione.",
    track: "classico-eschilo",
    icon: Globe,
    label: "Lingue classiche",
  },
  {
    id: "language-cards",
    title: "Lessico e argomentazione",
    description: "Costruisci una breve risposta e seleziona registro e parole chiave.",
    track: "scienze-umane-eschilo",
    icon: Globe,
    label: "Comunicazione",
  },
  {
    id: "creative-planner",
    title: "Storyboard e shot-list",
    description: "Organizza inquadratura, durata, audio e azione di ogni scena.",
    track: "audiovisivo",
    icon: Lightbulb,
    label: "Produzione",
  },
  {
    id: "creative-planner",
    title: "Prospettiva e proporzioni",
    description: "Imposta scala, linea d'orizzonte e proporzioni per una tavola.",
    track: "artistico",
    icon: Lightbulb,
    label: "Disegno",
  },
  {
    id: "creative-planner",
    title: "Tessuto, moda e materiali",
    description: "Abbina capo, materiale, mano e uso con una scheda di progetto.",
    track: "moda",
    icon: Lightbulb,
    label: "Materiali",
  },
  {
    id: "creative-planner",
    title: "Materiali e workflow protesico",
    description: "Scegli materiale e fase per un workflow odontotecnico tracciabile.",
    track: "odontotecnico",
    icon: Lightbulb,
    label: "Laboratorio",
  },
  {
    id: "creative-planner",
    title: "Materiali del prodotto",
    description: "Confronta materiale, finitura e destinazione per un progetto Made in Italy.",
    track: "made-italy",
    icon: Lightbulb,
    label: "Progetto",
  },
  {
    id: "statistics-lab",
    title: "Statistiche per TRED",
    description: "Calcola media, percentuali e regressione su dati di progetto.",
    track: "tred-vittorini",
    icon: Sigma,
    label: "Dati",
  },
  {
    id: "statistics-lab",
    title: "Statistiche biomediche",
    description: "Riassumi misure di laboratorio e relazione tra due variabili.",
    track: "biomedica-vittorini",
    icon: Sigma,
    label: "Laboratorio",
  },
  {
    id: "statistics-lab",
    title: "Percentuali e rese",
    description: "Calcola resa, variazione e tendenza dei dati agricoli.",
    track: "agraria",
    icon: Sigma,
    label: "Dati agricoli",
  },
  {
    id: "statistics-lab",
    title: "Percentuali e rese",
    description: "Calcola resa, variazione e tendenza dei dati vitivinicoli.",
    track: "viticoltura",
    icon: Sigma,
    label: "Dati enologici",
  },
  {
    id: "route-planner",
    title: "Distanza per cantiere",
    description: "Stima tragitto e durata per una visita tecnica.",
    track: "made-italy",
    icon: Globe,
    label: "Logistica",
  },
];

const SECOND_BLOCK_TOOLS: ShopTool[] = [
  {
    id: "electronics-lab",
    title: "Laboratorio elettronico DC/AC",
    description:
      "Esplora una rete resistiva, un diodo/LED e misure didattiche con KCL/KVL semplificate.",
    track: "elettronica",
    icon: CircuitBoard,
    label: "Misure e circuiti",
  },
  {
    id: "electronics-lab",
    title: "Laboratorio elettronico per meccatronica",
    description: "Leggi correnti di ramo, cadute e stato del diodo in una rete offline.",
    track: "meccatronica",
    icon: CircuitBoard,
    label: "Elettrotecnica applicata",
  },
  {
    id: "electronics-lab",
    title: "Misure elettriche di manutenzione",
    description:
      "Confronta valori attesi e misure di una rete resistiva senza simulare hardware reale.",
    track: "manutenzione",
    icon: CircuitBoard,
    label: "Diagnostica",
  },
  {
    id: "safety-lab",
    title: "Safety lab elettronica e officina",
    description: "Checklist locale per preparare banco, DPI, utensili e area di lavoro.",
    track: "elettronica",
    icon: ShieldCheck,
    label: "Sicurezza operativa",
  },
  {
    id: "safety-lab",
    title: "Safety lab officina",
    description: "Checklist locale per preparare banco, DPI, utensili e area di lavoro.",
    track: "meccatronica",
    icon: ShieldCheck,
    label: "Sicurezza operativa",
  },
  {
    id: "safety-lab",
    title: "Safety lab manutenzione",
    description: "Checklist locale per preparare banco, DPI, utensili e area di lavoro.",
    track: "manutenzione",
    icon: ShieldCheck,
    label: "Sicurezza operativa",
  },
  {
    id: "signal-lab",
    title: "Laboratorio segnali e oscilloscopio",
    description:
      "Confronta onda sinusoidale, quadra e triangolare con frequenza, periodo e ampiezza.",
    track: "elettronica",
    icon: Activity,
    label: "Segnali",
  },
  {
    id: "signal-lab",
    title: "Segnali per scienze applicate",
    description: "Genera una tabella di campioni e collega frequenza, periodo e ampiezza.",
    track: "scienze-applicate-vittorini",
    icon: Activity,
    label: "Fisica sperimentale",
  },
  {
    id: "signal-lab",
    title: "Segnali e dati biomedici",
    description:
      "Leggi una forma d’onda idealizzata come modello didattico, non come misura clinica.",
    track: "biomedica-vittorini",
    icon: Activity,
    label: "Biosegnali",
  },
  {
    id: "automation-lab",
    title: "Laboratorio automazione Ladder",
    description:
      "Prova una rete Ladder didattica con sensori, consenso e attuatore; non è un PLC reale.",
    track: "meccatronica",
    icon: GitBranch,
    label: "Automazione",
  },
  {
    id: "automation-lab",
    title: "Ladder e diagnostica manutenzione",
    description:
      "Attiva ingressi simulati, osserva l’uscita e individua il contatto che blocca il ciclo.",
    track: "manutenzione",
    icon: GitBranch,
    label: "Troubleshooting",
  },
  {
    id: "chemistry-lab",
    title: "Laboratorio formula e stechiometria",
    description: "Valida una formula semplice, calcola massa molare e converte grammi in moli.",
    track: "chimica",
    icon: Sigma,
    label: "Stechiometria",
  },
  {
    id: "biotech-lab",
    title: "Laboratorio DNA/RNA e codoni",
    description:
      "Controlla una sequenza, trova il complementare e traduci codoni RNA in amminoacidi.",
    track: "biotecnologie",
    icon: Binary,
    label: "Genetica",
  },
  {
    id: "biotech-lab",
    title: "Genetica molecolare biomedica",
    description:
      "Usa una sequenza breve per distinguere filamento complementare, RNA e traduzione.",
    track: "biomedica-vittorini",
    icon: Binary,
    label: "Biologia molecolare",
  },
  {
    id: "safety-lab",
    title: "Safety lab chimico e biotech",
    description: "Checklist locale per preparare laboratorio, DPI, materiali e smaltimento.",
    track: "chimica",
    icon: ShieldCheck,
    label: "Sicurezza di laboratorio",
  },
  {
    id: "safety-lab",
    title: "Safety lab biotech",
    description: "Checklist locale per preparare laboratorio, DPI, materiali e smaltimento.",
    track: "biotecnologie",
    icon: ShieldCheck,
    label: "Sicurezza di laboratorio",
  },
];

const THIRD_BLOCK_TOOLS: ShopTool[] = [
  {
    id: "physics-lab",
    title: "Laboratorio di fisica",
    description:
      "Modella moto rettilineo, energia/lavoro e seconda legge di Newton con input, risultato e tabella di confronto.",
    track: "scientifico-vittorini",
    icon: Gauge,
    label: "Fisica implicita",
  },
  {
    id: "physics-lab",
    title: "Fisica applicata",
    description:
      "Sperimenta moto, lavoro ed equilibrio dinamico con un modello semplificato e trasparente.",
    track: "scienze-applicate-vittorini",
    icon: Gauge,
    label: "Scienze applicate",
  },
  {
    id: "physics-lab",
    title: "Fisica e TRED",
    description:
      "Collega grandezze fisiche e dati in una simulazione locale di moto, energia e forza.",
    track: "tred-vittorini",
    icon: Gauge,
    label: "TRED",
  },
  {
    id: "waves-optics-lab",
    title: "Onde, ottica e fluidi",
    description:
      "Seleziona onde, lenti/specchi o galleggiamento: modello didattico semplificato, non misura reale.",
    track: "scienze-applicate-vittorini",
    icon: Lightbulb,
    label: "Fisica sperimentale",
  },
  {
    id: "business-lab",
    title: "Laboratorio business",
    description:
      "Simula fatturazione didattica, ammortamento/interesse e un registro di movimenti; non è fiscalità reale.",
    track: "afm",
    icon: Activity,
    label: "Gestione aziendale",
  },
  {
    id: "business-lab",
    title: "Business e sistemi informativi",
    description:
      "Organizza documenti e movimenti aziendali in un modello locale, solo per esercitazione.",
    track: "sia",
    icon: Activity,
    label: "SIA",
  },
  {
    id: "business-lab",
    title: "Business internazionale",
    description:
      "Confronta fatture, capitale e movimenti in una simulazione senza normativa fiscale reale.",
    track: "rim",
    icon: Activity,
    label: "RIM",
  },
  {
    id: "inventory-lab",
    title: "Magazzino locale",
    description:
      "Inserisci e rimuovi prodotti, controlla quantità, scorta minima e valore dell'inventario.",
    track: "enogastronomia",
    icon: Network,
    label: "Scorte",
  },
  {
    id: "inventory-lab",
    title: "Scorte di sala e vendita",
    description: "Gestisci una piccola lista prodotti locale e individua le scorte sotto soglia.",
    track: "sala-vendita",
    icon: Network,
    label: "Magazzino",
  },
  {
    id: "hospitality-lab",
    title: "Simulazione hospitality",
    description:
      "Gestisci prenotazioni/check-in, camere disponibili, occupazione e ADR in un unico scenario locale.",
    track: "accoglienza",
    icon: Globe,
    label: "Ospitalità",
  },
  {
    id: "travel-itinerary-lab",
    title: "Creatore di itinerari",
    description:
      "Progetta tappe e giorni, calcola costi e genera un preventivo: pianificazione, non budget generico.",
    track: "turismo",
    icon: Globe,
    label: "Pianificazione tappe",
  },
  {
    id: "travel-itinerary-lab",
    title: "Pacchetto per accoglienza",
    description:
      "Componi un pacchetto con tappe, durata e costi per un preventivo didattico locale.",
    track: "accoglienza",
    icon: Globe,
    label: "Itinerari",
  },
];
const FOURTH_BLOCK_TOOLS: ShopTool[] = [
  {
    id: "safety-lab",
    title: "Safety lab nautica e uscite",
    description: "Checklist locale per dotazioni, meteo, ruoli e comunicazioni prima dell'uscita.",
    track: "nautico",
    icon: ShieldCheck,
    label: "Sicurezza in navigazione",
  },
  {
    id: "geo-survey-lab",
    title: "Geo-survey lab",
    description:
      "Coordinate, triangolazione, pendenze/dislivelli e superfici/volumi in modalità selezionabili per C.A.T.",
    track: "cat",
    icon: Globe,
    label: "Rilievo e topografia",
  },
  {
    id: "navigation-lab",
    title: "Navigation lab",
    description:
      "Nodi, waypoint, velocità-tempo-distanza, coordinate e autonomia per nautico e aeronautico.",
    track: "nautico",
    icon: Globe,
    label: "Navigazione integrata",
  },
  {
    id: "navigation-lab",
    title: "Navigation lab",
    description:
      "Nodi, waypoint, velocità-tempo-distanza, coordinate e autonomia per nautico e aeronautico.",
    track: "aeronautico",
    icon: Globe,
    label: "Navigazione integrata",
  },
  {
    id: "language-classics-lab",
    title: "Language classics lab",
    description:
      "Flashcard di paradigmi e declinazioni, analisi guidata della frase e traduzione con suggerimenti locali.",
    track: "classico-eschilo",
    icon: Globe,
    label: "Latino e greco",
  },
  {
    id: "language-practice-lab",
    title: "Language practice lab",
    description:
      "Esercizi locali di lessico, grammatica e traduzione guidata per il percorso linguistico.",
    track: "linguistico-vittorini",
    icon: Globe,
    label: "Pratica linguistica",
  },
];
const FIFTH_BLOCK_TOOLS: ShopTool[] = [
  {
    id: "design-lab",
    title: "Design lab",
    description:
      "Sperimenta colore, tipografia e impaginazione/proporzioni in modalità selezionabili.",
    track: "grafica",
    icon: Lightbulb,
    label: "Progetto grafico",
  },
  {
    id: "design-lab",
    title: "Design lab artistico",
    description:
      "Collega palette, carattere e composizione a una tavola artistica, senza duplicare RGB/HEX.",
    track: "artistico",
    icon: Lightbulb,
    label: "Composizione",
  },
  {
    id: "media-storyboard-lab",
    title: "Media storyboard lab",
    description:
      "Costruisci scene, inquadrature, durata, audio e shot-list per un prodotto audiovisivo.",
    track: "audiovisivo",
    icon: Activity,
    label: "Pre-produzione",
  },
  {
    id: "media-storyboard-lab",
    title: "Storyboard per grafica",
    description: "Organizza una sequenza visiva con inquadrature e audio di riferimento.",
    track: "grafica",
    icon: Activity,
    label: "Narrazione visiva",
  },
  {
    id: "fashion-lab",
    title: "Fashion lab",
    description: "Registra misure e proporzioni e stima consumo e piazzamento del tessuto.",
    track: "moda",
    icon: Sigma,
    label: "Modellistica",
  },
  {
    id: "fashion-lab",
    title: "Fashion lab Made in Italy",
    description: "Simula scelta del tessuto, consumo e margine di taglio per un capo.",
    track: "made-italy",
    icon: Sigma,
    label: "Produzione artigianale",
  },
  {
    id: "dental-materials-lab",
    title: "Dental materials lab",
    description:
      "Guida anatomia e occlusione e collega materiali alle fasi impronta-modello-protesi.",
    track: "odontotecnico",
    icon: CircuitBoard,
    label: "Workflow protesico",
  },
  {
    id: "safety-lab",
    title: "Safety lab odontotecnico",
    description: "Checklist locale per preparare banco, DPI, strumenti e materiali protesici.",
    track: "odontotecnico",
    icon: ShieldCheck,
    label: "Sicurezza del banco",
  },
  {
    id: "social-research-lab",
    title: "Social research lab",
    description: "Crea un questionario locale, calcola frequenze/percentuali e leggi un grafico.",
    track: "scienze-umane-eschilo",
    icon: Sigma,
    label: "Ricerca sociale",
  },
  {
    id: "social-research-lab",
    title: "Social research lab LES",
    description:
      "Interpreta una piccola distribuzione per scienze umane e percorso economico-sociale.",
    track: "economico-sociale-eschilo",
    icon: Sigma,
    label: "Metodi quantitativi",
  },
  {
    id: "viticulture-traceability-lab",
    title: "Viticulture traceability lab",
    description:
      "Registra lotto, resa, zuccheri, pH e fermentazione con una traccia di filiera locale.",
    track: "viticoltura",
    icon: Activity,
    label: "Tracciabilità enologica",
  },
  {
    id: "viticulture-traceability-lab",
    title: "Traceability lab agraria",
    description:
      "Estende il bilancio agronomico con registro di lotto, resa e controlli di qualità.",
    track: "agraria",
    icon: Activity,
    label: "Filiera e qualità",
  },
  {
    id: "viticulture-traceability-lab",
    title: "Tracciabilità materia prima",
    description: "Collega lotto e controlli di processo alla trasformazione agroalimentare.",
    track: "enogastronomia",
    icon: Activity,
    label: "Filiera alimentare",
  },
];

const CATALOG_TOOLS = [
  ...TOOLS,
  ...FIRST_BLOCK_TOOLS,
  ...EXTRA_TOOLS,
  ...SECOND_BLOCK_TOOLS,
  ...THIRD_BLOCK_TOOLS,
  ...FOURTH_BLOCK_TOOLS,
  ...FIFTH_BLOCK_TOOLS,
];

const SAFETY_CHECKLIST = [
  {
    category: "Laboratorio chimico/biotech",
    items: [
      "Indossa i DPI previsti dal docente",
      "Etichetta campioni e reagenti",
      "Prepara raccolta e smaltimento indicati",
    ],
  },
  {
    category: "Elettronica/officina",
    items: [
      "Controlla banco, cavi e protezioni",
      "Metti in sicurezza l'alimentazione prima di intervenire",
      "Riordina utensili e area di lavoro",
    ],
  },
  {
    category: "Cucina/HACCP",
    items: [
      "Lava le mani e verifica la divisa",
      "Controlla separazione e tracciabilità degli alimenti",
      "Verifica pulizia e temperature previste",
    ],
  },
  {
    category: "Nautica/uscite",
    items: [
      "Verifica dotazioni e comunicazioni",
      "Controlla meteo, rotta e piano dell'uscita",
      "Condividi ruoli, rientro e procedure d'emergenza",
    ],
  },
  {
    category: "Odontotecnica",
    items: [
      "Indossa i DPI e prepara il banco",
      "Controlla materiali, strumenti e aspirazione",
      "Pulisci e disinfetta la postazione",
    ],
  },
] as const;

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
  "classico-eschilo": "Liceo Classico · Eschilo",
  "scienze-umane-eschilo": "Liceo delle Scienze Umane · Eschilo",
  "economico-sociale-eschilo": "Scienze Umane · Opzione Economico-Sociale",
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

function MolarityLab() {
  const [stock, setStock] = useState("1");
  const [finalC, setFinalC] = useState("0.1");
  const [volume, setVolume] = useState("250");
  const c1 = Number(stock),
    c2 = Number(finalC),
    v2 = Number(volume);
  const valid = c1 > 0 && c2 > 0 && c2 <= c1 && v2 > 0;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <NumberField id="molar-stock" label="C₁ stock" unit="M" value={stock} onChange={setStock} />
        <NumberField
          id="molar-final"
          label="C₂ finale"
          unit="M"
          value={finalC}
          onChange={setFinalC}
        />
        <NumberField id="molar-volume" label="V₂" unit="mL" value={volume} onChange={setVolume} />
      </div>
      {valid ? (
        <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm">
          Preleva <strong>{((c2 * v2) / c1).toFixed(2)} mL</strong> di stock e aggiungi{" "}
          <strong>{(v2 - (c2 * v2) / c1).toFixed(2)} mL</strong> di solvente.
          <br />
          <span className="text-xs text-muted-foreground">C₁V₁ = C₂V₂</span>
        </p>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Usa concentrazioni positive con C₂ ≤ C₁ e volume positivo.
        </p>
      )}
    </div>
  );
}
function PhLab() {
  const [concentration, setConcentration] = useState("0.001");
  const [kind, setKind] = useState("acid");
  const c = Number(concentration);
  const valid = c > 0;
  const ph = valid ? (kind === "acid" ? -Math.log10(c) : 14 + Math.log10(c)) : null;
  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Tipo
        <select
          aria-label="Tipo di soluzione"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
        >
          <option value="acid">Acido forte</option>
          <option value="base">Base forte</option>
        </select>
      </label>
      <NumberField
        id="ph-concentration"
        label="Concentrazione"
        unit="mol/L"
        value={concentration}
        onChange={setConcentration}
      />
      {valid && ph !== null && ph >= 0 && ph <= 14 ? (
        <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm">
          pH stimato: <strong>{ph.toFixed(2)}</strong> · pOH {(14 - ph).toFixed(2)}
        </p>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Inserisci una concentrazione positiva compatibile con la scala 0–14.
        </p>
      )}
    </div>
  );
}
function parseSeries(value: string) {
  return value
    .split(/[;,\s]+/)
    .map(Number)
    .filter(Number.isFinite);
}
function StatisticsLab() {
  const [raw, setRaw] = useState("4, 7, 8, 10, 11");
  const [xraw, setXraw] = useState("1, 2, 3, 4, 5");
  const ys = parseSeries(raw),
    xs = parseSeries(xraw),
    mean = ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : 0,
    sorted = [...ys].sort((a, b) => a - b),
    median = sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : 0,
    variance = ys.length ? ys.reduce((a, b) => a + (b - mean) ** 2, 0) / ys.length : 0;
  const n = Math.min(xs.length, ys.length),
    mx = n ? xs.slice(0, n).reduce((a, b) => a + b, 0) / n : 0,
    my = n ? ys.slice(0, n).reduce((a, b) => a + b, 0) / n : 0,
    den = xs.slice(0, n).reduce((a, b) => a + (b - mx) ** 2, 0),
    slope = den
      ? xs.slice(0, n).reduce((a, b, i) => a + (b - mx) * ((ys[i] ?? 0) - my), 0) / den
      : 0,
    intercept = my - slope * mx;
  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Valori y
        <input
          aria-label="Valori statistici"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
        />
      </label>
      <label className="block text-xs font-medium text-muted-foreground">
        Valori x (regressione)
        <input
          aria-label="Valori x regressione"
          value={xraw}
          onChange={(e) => setXraw(e.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
        />
      </label>
      {ys.length ? (
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-[10px] text-muted-foreground">Media / mediana</dt>
            <dd className="font-semibold">
              {mean.toFixed(2)} / {median}
            </dd>
          </div>
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-[10px] text-muted-foreground">Deviazione standard</dt>
            <dd className="font-semibold">{Math.sqrt(variance).toFixed(2)}</dd>
          </div>
          <div className="col-span-2 rounded-xl bg-primary-soft p-3">
            <dt className="text-[10px] text-muted-foreground">Retta y = ax + b</dt>
            <dd className="font-semibold">
              y = {slope.toFixed(3)}x + {intercept.toFixed(3)}
            </dd>
          </div>
        </dl>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Inserisci una serie numerica.
        </p>
      )}
    </div>
  );
}
function RoutePlanner() {
  const [lat1, setLat1] = useState("37.07"),
    [lon1, setLon1] = useState("14.25"),
    [lat2, setLat2] = useState("37.50"),
    [lon2, setLon2] = useState("15.08"),
    [speed, setSpeed] = useState("60");
  const rad = Math.PI / 180,
    a = Number(lat1) * rad,
    b = Number(lat2) * rad,
    dlat = (Number(lat2) - Number(lat1)) * rad,
    dlon = (Number(lon2) - Number(lon1)) * rad,
    h = Math.sin(dlat / 2) ** 2 + Math.cos(a) * Math.cos(b) * Math.sin(dlon / 2) ** 2,
    km = 6371 * 2 * Math.asin(Math.sqrt(h)),
    valid = [a, b, km, Number(speed)].every(Number.isFinite) && Number(speed) > 0;
  const bearing =
    (Math.atan2(
      Math.sin(dlon) * Math.cos(b),
      Math.cos(a) * Math.sin(b) - Math.sin(a) * Math.cos(b) * Math.cos(dlon),
    ) /
      rad +
      360) %
    360;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <NumberField id="route-lat1" label="Lat. partenza" value={lat1} onChange={setLat1} />
        <NumberField id="route-lon1" label="Lon. partenza" value={lon1} onChange={setLon1} />
        <NumberField id="route-lat2" label="Lat. arrivo" value={lat2} onChange={setLat2} />
        <NumberField id="route-lon2" label="Lon. arrivo" value={lon2} onChange={setLon2} />
      </div>
      <NumberField
        id="route-speed"
        label="Velocità"
        unit="km/h"
        value={speed}
        onChange={setSpeed}
      />
      {valid ? (
        <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm">
          Distanza: <strong>{km.toFixed(1)} km</strong> · rotta iniziale:{" "}
          <strong>{bearing.toFixed(0)}°</strong> · ETA:{" "}
          <strong>{(km / Number(speed)).toFixed(2)} h</strong>
        </p>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Inserisci coordinate e velocità valide.
        </p>
      )}
    </div>
  );
}
function FoodCost() {
  const [ingredients, setIngredients] = useState("12"),
    [portions, setPortions] = useState("10"),
    [margin, setMargin] = useState("30");
  const c = Number(ingredients),
    p = Number(portions),
    m = Number(margin),
    valid = c >= 0 && p > 0 && m >= 0;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <NumberField
          id="food-total"
          label="Costo ingredienti"
          unit="€"
          value={ingredients}
          onChange={setIngredients}
        />
        <NumberField id="food-portions" label="Porzioni" value={portions} onChange={setPortions} />
        <NumberField
          id="food-margin"
          label="Ricarico"
          unit="%"
          value={margin}
          onChange={setMargin}
        />
      </div>
      {valid ? (
        <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm">
          Costo porzione: <strong>{(c / p).toFixed(2)} €</strong> · prezzo indicativo:{" "}
          <strong>{((c / p) * (1 + m / 100)).toFixed(2)} €</strong>
        </p>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Inserisci costi non negativi, porzioni positive e ricarico valido.
        </p>
      )}
      <div className="rounded-xl border border-border p-3 text-xs">
        <p className="font-semibold">Checklist HACCP</p>
        {["Catena del freddo", "Allergeni identificati", "Superfici sanificate"].map((item) => (
          <label key={item} className="mt-2 flex gap-2">
            <input type="checkbox" /> {item}
          </label>
        ))}
      </div>
    </div>
  );
}
function LedgerCashflow() {
  const [income, setIncome] = useState("1200"),
    [outcome, setOutcome] = useState("450");
  const saldo = Number(income) - Number(outcome);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          id="ledger-income"
          label="Entrate / Dare"
          unit="€"
          value={income}
          onChange={setIncome}
        />
        <NumberField
          id="ledger-outcome"
          label="Uscite / Avere"
          unit="€"
          value={outcome}
          onChange={setOutcome}
        />
      </div>
      <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm">
        Saldo cash-flow: <strong>{saldo.toFixed(2)} €</strong> ·{" "}
        {saldo >= 0 ? "avanzo" : "fabbisogno"}
      </p>
    </div>
  );
}
function SqlSchema() {
  const [table, setTable] = useState("clienti"),
    [field, setField] = useState("cognome");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-medium text-muted-foreground">
          Tabella
          <input
            aria-label="Nome tabella"
            value={table}
            onChange={(e) => setTable(e.target.value.replace(/\W/g, ""))}
            className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Campo filtro
          <input
            aria-label="Campo filtro"
            value={field}
            onChange={(e) => setField(e.target.value.replace(/\W/g, ""))}
            className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
          />
        </label>
      </div>
      <pre className="overflow-auto rounded-xl bg-surface p-3 text-xs">{`CREATE TABLE ${table || "tabella"} (id INTEGER PRIMARY KEY, ${field || "campo"} TEXT);\nSELECT * FROM ${table || "tabella"} ORDER BY ${field || "campo"};`}</pre>
    </div>
  );
}
function AgronomyLab() {
  const [area, setArea] = useState("1000"),
    [water, setWater] = useState("25"),
    [yieldKg, setYieldKg] = useState("650");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <NumberField id="agri-area" label="Superficie" unit="m²" value={area} onChange={setArea} />
        <NumberField id="agri-water" label="Acqua" unit="L/m²" value={water} onChange={setWater} />
        <NumberField
          id="agri-yield"
          label="Produzione"
          unit="kg"
          value={yieldKg}
          onChange={setYieldKg}
        />
      </div>
      <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm">
        Fabbisogno idrico: <strong>{((Number(area) * Number(water)) / 1000).toFixed(1)} m³</strong>{" "}
        · resa: <strong>{((Number(yieldKg) / Number(area)) * 10000).toFixed(0)} kg/ha</strong>
      </p>
    </div>
  );
}
function PlcTroubleshooter() {
  const [input, setInput] = useState(false),
    [sensor, setSensor] = useState(false);
  const output = input && sensor;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Button variant={input ? "default" : "outline"} onClick={() => setInput((v) => !v)}>
          Start: {input ? "ON" : "OFF"}
        </Button>
        <Button variant={sensor ? "default" : "outline"} onClick={() => setSensor((v) => !v)}>
          Sensore: {sensor ? "OK" : "KO"}
        </Button>
      </div>
      <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm">
        Uscita motore: <strong>{output ? "ATTIVA" : "FERMA"}</strong> ·{" "}
        {input ? (sensor ? "Nessun guasto" : "Controlla sensore") : "Controlla consenso di avvio"}
      </p>
    </div>
  );
}
function LanguageCards() {
  const [known, setKnown] = useState(false),
    [register, setRegister] = useState("formale");
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-surface p-4">
        <p className="text-xs text-muted-foreground">Flashcard</p>
        <p className="mt-1 text-lg font-semibold">
          {known ? "sviluppo → development" : "development → sviluppo"}
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => setKnown((v) => !v)}>Rivela / ripassa</Button>
        <select
          aria-label="Registro traduzione"
          value={register}
          onChange={(e) => setRegister(e.target.value)}
          className="h-10 rounded-xl border border-input bg-card px-3 text-sm"
        >
          <option value="formale">Formale</option>
          <option value="informale">Informale</option>
        </select>
      </div>
      <p role="status" className="text-xs text-muted-foreground">
        Registro selezionato: {register} · prova a riformulare la frase.
      </p>
    </div>
  );
}
function CreativePlanner() {
  const [name, setName] = useState("Scena / campione"),
    [material, setMaterial] = useState("cotone / luce morbida");
  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Titolo progetto
        <input
          aria-label="Titolo progetto"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
        />
      </label>
      <label className="block text-xs font-medium text-muted-foreground">
        Materiale / indicazione
        <input
          aria-label="Materiale progetto"
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
        />
      </label>
      <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm">
        <strong>{name || "Progetto"}</strong> · scheda pronta: {material || "aggiungi materiali"}
      </p>
    </div>
  );
}

function WebLab() {
  const [html, setHtml] = useState(
    "<main><h1>Ciao web!</h1><p>Una pagina costruita da te.</p></main>",
  );
  const [css, setCss] = useState(
    "body { font-family: sans-serif; padding: 1rem; color: #17324d; } h1 { color: #0f766e; }",
  );
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`;
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        L’anteprima usa un iframe sandboxato senza <code>allow-scripts</code>: HTML e CSS restano
        locali.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-xs font-medium text-muted-foreground">
          HTML
          <textarea
            aria-label="Editor HTML"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            className="mt-1 min-h-36 w-full rounded-xl border border-input bg-card p-3 font-mono text-xs"
          />
        </label>
        <label className="block text-xs font-medium text-muted-foreground">
          CSS
          <textarea
            aria-label="Editor CSS"
            value={css}
            onChange={(e) => setCss(e.target.value)}
            className="mt-1 min-h-36 w-full rounded-xl border border-input bg-card p-3 font-mono text-xs"
          />
        </label>
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold">Anteprima locale</p>
        <iframe
          title="Anteprima HTML e CSS"
          sandbox=""
          srcDoc={srcDoc}
          className="h-48 w-full rounded-xl border border-border bg-white"
        />
      </div>
    </div>
  );
}

const CODE_EXAMPLES = {
  somma: {
    label: "Somma di due numeri",
    pseudo: "leggi a, b\nmostra a + b",
    output: "La somma di 7 e 5 è 12.",
  },
  pari: {
    label: "Controllo pari/dispari",
    pseudo: "se n % 2 = 0 allora\n  mostra pari\naltrimenti mostra dispari",
    output: "18 è pari.",
  },
  ciclo: {
    label: "Ciclo di conteggio",
    pseudo: "per i da 1 a 4\n  mostra i",
    output: "1 · 2 · 3 · 4",
  },
} as const;
function CodeLab() {
  const [example, setExample] = useState<keyof typeof CODE_EXAMPLES>("somma");
  const current = CODE_EXAMPLES[example];
  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Esempio guidato
        <select
          aria-label="Esempio di codice"
          value={example}
          onChange={(e) => setExample(e.target.value as keyof typeof CODE_EXAMPLES)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
        >
          {Object.entries(CODE_EXAMPLES).map(([key, item]) => (
            <option key={key} value={key}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <pre className="rounded-xl bg-surface p-3 text-xs">{current.pseudo}</pre>
      <p
        role="status"
        aria-label="Output del laboratorio"
        className="rounded-xl bg-primary-soft p-3 text-sm"
      >
        Output locale: <strong>{current.output}</strong>
      </p>
      <p className="text-xs text-muted-foreground">
        Sono disponibili solo esempi predefiniti: nessun codice inserito viene eseguito con eval.
      </p>
    </div>
  );
}

type SqlRow = { id: number; name: string; track: string; grade: number };
const SQL_ROWS: SqlRow[] = [
  { id: 1, name: "Arianna", track: "Informatica", grade: 8 },
  { id: 2, name: "Bruno", track: "SIA", grade: 7 },
  { id: 3, name: "Chiara", track: "Scientifico", grade: 9 },
];
function SqlLab() {
  const [query, setQuery] = useState(
    "SELECT name, grade FROM studenti WHERE grade >= 8 ORDER BY grade DESC;",
  );
  const match = query
    .trim()
    .match(
      /^SELECT\s+(\*|name\s*,\s*grade)\s+FROM\s+studenti(?:\s+WHERE\s+grade\s*>=\s*(\d+))?(?:\s+ORDER\s+BY\s+(name|grade)(?:\s+(ASC|DESC))?)?\s*;?$/i,
    );
  let rows = match ? SQL_ROWS.filter((row) => !match[2] || row.grade >= Number(match[2])) : [];
  const orderBy = match?.[3];
  if (orderBy)
    rows = [...rows].sort((a, b) =>
      orderBy.toLowerCase() === "name" ? a.name.localeCompare(b.name) : a.grade - b.grade,
    );
  if (match?.[4]?.toLowerCase() === "desc") rows.reverse();
  const columns = match?.[1] === "*" ? ["id", "name", "track", "grade"] : ["name", "grade"];
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-surface p-3 text-xs">
        <p className="font-semibold">Schema fisso: studenti</p>
        <p className="mt-1 font-mono">id INTEGER · name TEXT · track TEXT · grade INTEGER</p>
      </div>
      <label className="block text-xs font-medium text-muted-foreground">
        Query SELECT
        <textarea
          aria-label="Query SQL"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mt-1 min-h-24 w-full rounded-xl border border-input bg-card p-3 font-mono text-xs"
        />
      </label>
      {match ? (
        <div
          role="status"
          aria-label="Risultato query SQL"
          className="overflow-auto rounded-xl border border-border"
        >
          <table className="w-full text-left text-xs">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column} className="border-b border-border p-2 font-semibold">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => (
                    <td key={column} className="p-2">
                      {row[column as keyof SqlRow]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="p-2 text-muted-foreground">{rows.length} righe · dataset locale</p>
        </div>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Query non riconosciuta: usa solo SELECT sulle colonne dello schema studenti.
        </p>
      )}
    </div>
  );
}

function MathLab() {
  const [a, setA] = useState("1"),
    [b, setB] = useState("-3"),
    [c, setC] = useState("2");
  const A = Number(a),
    B = Number(b),
    C = Number(c),
    valid = [A, B, C].every(Number.isFinite) && (A !== 0 || B !== 0);
  const delta = B * B - 4 * A * C,
    roots =
      A === 0
        ? [-C / B]
        : delta < 0
          ? []
          : delta === 0
            ? [-B / (2 * A)]
            : [(-B - Math.sqrt(delta)) / (2 * A), (-B + Math.sqrt(delta)) / (2 * A)];
  const points = [-2, -1, 0, 1, 2].map((x) => ({ x, y: A * x * x + B * x + C }));
  const max = Math.max(...points.map((p) => Math.abs(p.y)), 1);
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Equazione ax² + bx + c = 0: se a = 0 viene risolta come equazione lineare.
      </p>
      <div className="grid grid-cols-3 gap-2">
        <NumberField id="math-a" label="a" value={a} onChange={setA} />
        <NumberField id="math-b" label="b" value={b} onChange={setB} />
        <NumberField id="math-c" label="c" value={c} onChange={setC} />
      </div>
      {valid ? (
        <>
          <p
            role="status"
            aria-label="Risultato equazione"
            className="rounded-xl bg-primary-soft p-3 text-sm"
          >
            Δ = <strong>{delta.toFixed(2)}</strong> · soluzioni:{" "}
            <strong>
              {roots.length ? roots.map((root) => root.toFixed(2)).join(", ") : "nessuna reale"}
            </strong>
          </p>
          <table className="w-full text-xs">
            <caption className="mb-1 text-left font-semibold">
              Tabella valori e grafico semplice
            </caption>
            <tbody>
              {points.map((point) => (
                <tr key={point.x}>
                  <td className="p-1">x = {point.x}</td>
                  <td className="p-1">f(x) = {point.y.toFixed(2)}</td>
                  <td className="p-1">
                    <span
                      className="inline-block h-2 rounded bg-primary"
                      style={{ width: `${Math.max(4, (Math.abs(point.y) / max) * 100)}%` }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Inserisci coefficienti numerici e almeno a o b diverso da zero.
        </p>
      )}
    </div>
  );
}

function ElectronicsLab() {
  const [mode, setMode] = useState("DC");
  const [supply, setSupply] = useState("12");
  const [r1, setR1] = useState("1000");
  const [r2, setR2] = useState("2200");
  const [diode, setDiode] = useState("on");
  const v = Number(supply),
    R1 = Number(r1),
    R2 = Number(r2);
  const valid = v > 0 && R1 > 0 && R2 > 0 && [v, R1, R2].every(Number.isFinite);
  const current = valid ? v / (R1 + R2) : 0;
  const node = valid ? (v * R2) / (R1 + R2) : 0;
  const diodeDrop = diode === "on" ? 0.7 : 0;
  const ledCurrent = valid && v > diodeDrop ? (v - diodeDrop) / R1 : 0;
  const displayCurrent = mode === "AC" ? current / Math.sqrt(2) : current;
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Modello ideale offline: in AC usiamo il valore RMS e non fasori o componenti reattivi.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-medium text-muted-foreground">
          Modalità
          <select
            aria-label="Modalità circuito"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
          >
            <option>DC</option>
            <option>AC</option>
          </select>
        </label>
        <label className="block text-xs font-medium text-muted-foreground">
          Diodo/LED
          <select
            aria-label="Stato diodo"
            value={diode}
            onChange={(e) => setDiode(e.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
          >
            <option value="on">Inserito (0,7 V)</option>
            <option value="off">Bypass</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <NumberField
          id="electronics-supply"
          label="Alimentazione"
          unit="V"
          value={supply}
          onChange={setSupply}
        />
        <NumberField id="electronics-r1" label="Ramo R1" unit="Ω" value={r1} onChange={setR1} />
        <NumberField id="electronics-r2" label="Ramo R2" unit="Ω" value={r2} onChange={setR2} />
      </div>
      {valid ? (
        <>
          <p
            role="status"
            aria-label="Misure circuito"
            className="rounded-xl bg-primary-soft p-3 text-sm"
          >
            KCL: I ingresso = I ramo · KVL: Σ cadute = V alimentazione.
          </p>
          <table className="w-full text-xs">
            <caption className="mb-1 text-left font-semibold">Tabella misure didattiche</caption>
            <tbody>
              <tr>
                <td className="p-1">I totale ({mode})</td>
                <td className="p-1 font-mono">{(displayCurrent * 1000).toFixed(2)} mA</td>
              </tr>
              <tr>
                <td className="p-1">V nodo partitore</td>
                <td className="p-1 font-mono">{node.toFixed(2)} V</td>
              </tr>
              <tr>
                <td className="p-1">I LED ideale</td>
                <td className="p-1 font-mono">{(ledCurrent * 1000).toFixed(2)} mA</td>
              </tr>
            </tbody>
          </table>
        </>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Inserisci tensione e resistenze positive.
        </p>
      )}
    </div>
  );
}

function SignalLab() {
  const [shape, setShape] = useState("Sinusoide");
  const [frequency, setFrequency] = useState("2");
  const [amplitude, setAmplitude] = useState("1");
  const f = Number(frequency),
    a = Number(amplitude),
    valid = f > 0 && a >= 0 && [f, a].every(Number.isFinite);
  const samples = [0, 0.125, 0.25, 0.375, 0.5].map((t) => {
    const phase = (t * f) % 1;
    const y =
      shape === "Sinusoide"
        ? Math.sin(phase * 2 * Math.PI)
        : shape === "Quadra"
          ? phase < 0.5
            ? 1
            : -1
          : 1 - 4 * Math.abs(Math.round(phase) - phase);
    return { t, y: y * a };
  });
  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Forma d’onda
        <select
          aria-label="Forma d onda"
          value={shape}
          onChange={(e) => setShape(e.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
        >
          <option>Sinusoide</option>
          <option>Quadra</option>
          <option>Triangolare</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          id="signal-frequency"
          label="Frequenza"
          unit="Hz"
          value={frequency}
          onChange={setFrequency}
        />
        <NumberField
          id="signal-amplitude"
          label="Ampiezza"
          unit="unità"
          value={amplitude}
          onChange={setAmplitude}
        />
      </div>
      {valid ? (
        <>
          <p
            role="status"
            aria-label="Parametri segnale"
            className="rounded-xl bg-primary-soft p-3 text-sm"
          >
            Periodo: <strong>{(1 / f).toFixed(3)} s</strong> · picco-picco:{" "}
            <strong>{(2 * a).toFixed(2)}</strong>
          </p>
          <table className="w-full text-xs">
            <caption className="mb-1 text-left font-semibold">
              Campioni su un intervallo di 0,5 s
            </caption>
            <tbody>
              {samples.map((sample) => (
                <tr key={sample.t}>
                  <td className="p-1">t = {sample.t.toFixed(3)} s</td>
                  <td className="p-1 font-mono">y = {sample.y.toFixed(3)}</td>
                  <td className="p-1">
                    <span
                      className="inline-block h-2 rounded bg-primary"
                      style={{
                        width: `${Math.max(4, Math.min(100, 50 + (sample.y / Math.max(a, 1)) * 50))}%`,
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Inserisci frequenza positiva e ampiezza non negativa.
        </p>
      )}
    </div>
  );
}

function AutomationLab() {
  const [sensor, setSensor] = useState(false),
    [guard, setGuard] = useState(true),
    [start, setStart] = useState(false);
  const output = sensor && guard && start;
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Rete didattica: [START] AND [SENSORE] AND [RIPARO CHIUSO] → (MOTORE). Non invia comandi a un
        PLC.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <Button variant={start ? "default" : "outline"} onClick={() => setStart(!start)}>
          START: {start ? "1" : "0"}
        </Button>
        <Button variant={sensor ? "default" : "outline"} onClick={() => setSensor(!sensor)}>
          Sensore: {sensor ? "1" : "0"}
        </Button>
        <Button variant={guard ? "default" : "outline"} onClick={() => setGuard(!guard)}>
          Riparo: {guard ? "chiuso" : "aperto"}
        </Button>
      </div>
      <p
        role="status"
        aria-label={`Uscita attuatore: ${output ? "attiva" : "ferma"}`}
        className="rounded-xl bg-primary-soft p-3 text-sm"
      >
        Uscita attuatore: <strong>{output ? "ATTIVA" : "FERMA"}</strong>
      </p>
      <p className="text-xs text-muted-foreground">
        Diagnosi:{" "}
        {output
          ? "tutti i contatti della serie sono chiusi."
          : `contatto aperto: ${!start ? "START" : !sensor ? "SENSORE" : "RIPARO"}.`}
      </p>
    </div>
  );
}

const ATOMIC_MASSES: Record<string, number> = {
  H: 1.008,
  C: 12.011,
  N: 14.007,
  O: 15.999,
  Na: 22.99,
  Cl: 35.45,
  Ca: 40.078,
};
function parseFormula(formula: string) {
  const matches = [...formula.trim().matchAll(/([A-Z][a-z]?)(\d*)/g)];
  if (
    !formula.trim() ||
    matches.length === 0 ||
    matches.map((m) => m[0]).join("") !== formula.trim()
  )
    return null;
  const parts = matches.map((m) => ({ symbol: m[1]!, count: Number(m[2] || 1) }));
  return parts.every(({ symbol, count }) => ATOMIC_MASSES[symbol] && count > 0 && count <= 99)
    ? parts
    : null;
}
function ChemistryLab() {
  const [formula, setFormula] = useState("H2O"),
    [grams, setGrams] = useState("18");
  const parts = parseFormula(formula);
  const mass = parts?.reduce((sum, part) => sum + ATOMIC_MASSES[part.symbol]! * part.count, 0) ?? 0;
  const g = Number(grams);
  const valid = Boolean(parts) && mass > 0 && g >= 0 && Number.isFinite(g);
  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Formula semplice (es. H2O, CO2, NaCl)
        <input
          aria-label="Formula chimica"
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
        />
      </label>
      <NumberField
        id="chemistry-grams"
        label="Massa del campione"
        unit="g"
        value={grams}
        onChange={setGrams}
      />
      {valid ? (
        <p
          role="status"
          aria-label="Risultato stechiometria"
          className="rounded-xl bg-primary-soft p-3 text-sm"
        >
          Massa molare: <strong>{mass.toFixed(3)} g/mol</strong> · quantità:{" "}
          <strong>{(g / mass).toFixed(4)} mol</strong>
          <br />
          <span className="text-xs text-muted-foreground">
            Calcolo introduttivo senza parentesi o cariche ioniche.
          </span>
        </p>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Formula non valida: usa elementi supportati e pedici interi positivi.
        </p>
      )}
    </div>
  );
}

const CODONS: Record<string, string> = {
  AUG: "Met",
  UUU: "Phe",
  UUC: "Phe",
  UGG: "Trp",
  UAA: "STOP",
  UAG: "STOP",
  UGA: "STOP",
  GCU: "Ala",
  GCC: "Ala",
  GGC: "Gly",
  GGG: "Gly",
};
function BiotechLab() {
  const [sequence, setSequence] = useState("ATGGGCTAA");
  const clean = sequence.toUpperCase().replaceAll(" ", "");
  const valid = /^[ATCG]+$/.test(clean) && clean.length <= 90;
  const rna = valid ? clean.replaceAll("T", "U") : "";
  const complement = valid
    ? [...clean].map((base) => ({ A: "T", T: "A", C: "G", G: "C" })[base]).join("")
    : "";
  const codons = valid ? (rna.match(/.{1,3}/g) ?? []) : [];
  const translation = codons.map((codon) => CODONS[codon] ?? "?").join(" · ");
  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Sequenza DNA (A, T, C, G)
        <input
          aria-label="Sequenza DNA"
          value={sequence}
          onChange={(e) => setSequence(e.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 font-mono text-sm"
        />
      </label>
      {valid ? (
        <div
          role="status"
          aria-label="Risultato biologia molecolare"
          className="rounded-xl bg-primary-soft p-3 text-sm"
        >
          <p>
            Complementare: <strong className="font-mono">{complement}</strong>
          </p>
          <p>
            RNA messaggero: <strong className="font-mono">{rna}</strong>
          </p>
          <p>
            Codoni: <strong>{translation}</strong>
          </p>
          <span className="text-xs text-muted-foreground">
            Sono riconosciuti alcuni codoni d’esempio; “?” segnala un codone non incluso nella
            tabella didattica.
          </span>
        </div>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Inserisci solo A, T, C, G e una sequenza non vuota (massimo 90 basi).
        </p>
      )}
    </div>
  );
}

function PhysicsLab() {
  const [mode, setMode] = useState("motion");
  const [a, setA] = useState("12"),
    [b, setB] = useState("5"),
    [c, setC] = useState("2");
  const x = Number(a),
    y = Number(b),
    z = Number(c);
  const result =
    mode === "motion"
      ? { label: "spazio", value: x * y + 0.5 * z * y * y, unit: "m" }
      : mode === "energy"
        ? { label: "lavoro", value: x * y, unit: "J" }
        : { label: "forza", value: x * y, unit: "N" };
  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Modalità
        <select
          aria-label="Modalità fisica"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
        >
          <option value="motion">Moto rettilineo: s = v·t + ½a·t²</option>
          <option value="energy">Energia/lavoro: W = F·d</option>
          <option value="newton">Newton: F = m·a</option>
        </select>
      </label>
      <div className="grid grid-cols-3 gap-2">
        <NumberField
          id="physics-a"
          label={mode === "newton" ? "Massa" : mode === "energy" ? "Forza" : "Velocità"}
          unit={mode === "newton" ? "kg" : mode === "energy" ? "N" : "m/s"}
          value={a}
          onChange={setA}
        />
        <NumberField
          id="physics-b"
          label={mode === "motion" ? "Tempo" : mode === "energy" ? "Distanza" : "Accelerazione"}
          unit={mode === "motion" ? "s" : mode === "energy" ? "m" : "m/s²"}
          value={b}
          onChange={setB}
        />
        <NumberField
          id="physics-c"
          label={mode === "motion" ? "Accelerazione" : "Dato extra"}
          unit={mode === "motion" ? "m/s²" : "—"}
          value={c}
          onChange={setC}
        />
      </div>
      <p
        role="status"
        aria-label={`Risultato fisica: ${result.label} ${result.value.toFixed(2)} ${result.unit}`}
        className="rounded-xl bg-primary-soft p-3 text-sm"
      >
        Risultato:{" "}
        <strong>
          {result.label} = {Number.isFinite(result.value) ? result.value.toFixed(2) : "—"}{" "}
          {result.unit}
        </strong>
      </p>
      <table className="w-full text-xs">
        <caption className="mb-1 text-left font-semibold">Tabella modello</caption>
        <tbody>
          <tr>
            <th className="p-1 text-left">Grandezza</th>
            <th className="p-1 text-right">Valore</th>
          </tr>
          <tr>
            <td className="p-1">Input 1</td>
            <td className="p-1 text-right">{x}</td>
          </tr>
          <tr>
            <td className="p-1">Input 2</td>
            <td className="p-1 text-right">{y}</td>
          </tr>
          <tr>
            <td className="p-1">Risultato</td>
            <td className="p-1 text-right">
              {result.value.toFixed(2)} {result.unit}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
function WavesOpticsLab() {
  const [mode, setMode] = useState("waves"),
    [one, setOne] = useState("2"),
    [two, setTwo] = useState("0.5");
  const a = Number(one),
    b = Number(two);
  const result =
    mode === "waves"
      ? `periodo ${(a > 0 ? 1 / a : 0).toFixed(2)} s`
      : mode === "optics"
        ? `immagine a ${((a * b) / (a - b || 1)).toFixed(2)} cm (lente sottile)`
        : `volume immerso ${(a > 0 ? (b / a) * 100 : 0).toFixed(1)}%`;
  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Modello
        <select
          aria-label="Modalità onde ottica fluidi"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
        >
          <option value="waves">Onde: T = 1/f</option>
          <option value="optics">Lente sottile: 1/f = 1/p + 1/q</option>
          <option value="float">Galleggiamento: volume immerso</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          id="waves-one"
          label={
            mode === "waves"
              ? "Frequenza"
              : mode === "optics"
                ? "Distanza oggetto"
                : "Densità fluido"
          }
          unit={mode === "waves" ? "Hz" : "cm / kg·L⁻¹"}
          value={one}
          onChange={setOne}
        />
        <NumberField
          id="waves-two"
          label={
            mode === "waves"
              ? "Ampiezza"
              : mode === "optics"
                ? "Distanza focale"
                : "Densità oggetto"
          }
          unit={mode === "waves" ? "m" : "cm / kg·L⁻¹"}
          value={two}
          onChange={setTwo}
        />
      </div>
      <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm">
        <strong>{result}</strong>
      </p>
      <p className="text-xs text-muted-foreground">
        Modello semplificato per esercitazione: non sostituisce una misura di laboratorio.
      </p>
    </div>
  );
}
function BusinessLab() {
  const [price, setPrice] = useState("100"),
    [qty, setQty] = useState("3"),
    [capital, setCapital] = useState("1200"),
    [rate, setRate] = useState("5"),
    [years, setYears] = useState("4"),
    [moves, setMoves] = useState("250,-80,120");
  const total = Number(price) * Number(qty),
    interest = ((Number(capital) * Number(rate)) / 100) * Number(years),
    balance = moves
      .split(",")
      .map(Number)
      .filter(Number.isFinite)
      .reduce((a, n) => a + n, 0);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          id="business-price"
          label="Prezzo unitario"
          unit="€"
          value={price}
          onChange={setPrice}
        />
        <NumberField id="business-qty" label="Quantità" value={qty} onChange={setQty} />
        <NumberField
          id="business-capital"
          label="Capitale didattico"
          unit="€"
          value={capital}
          onChange={setCapital}
        />
        <NumberField
          id="business-rate"
          label="Tasso semplice"
          unit="%"
          value={rate}
          onChange={setRate}
        />
        <NumberField id="business-years" label="Anni" value={years} onChange={setYears} />
      </div>
      <label className="block text-xs font-medium text-muted-foreground">
        Movimenti locali (separati da virgola)
        <input
          aria-label="Movimenti business"
          value={moves}
          onChange={(e) => setMoves(e.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
        />
      </label>
      <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm">
        Fattura didattica: <strong>{total.toFixed(2)} €</strong> · interesse semplice:{" "}
        <strong>{interest.toFixed(2)} €</strong> · saldo registro:{" "}
        <strong>{balance.toFixed(2)} €</strong>
      </p>
      <p className="text-xs text-muted-foreground">
        Esempio educativo: non calcola imposte, IVA o adempimenti fiscali reali.
      </p>
    </div>
  );
}
function InventoryLab() {
  const [rows, setRows] = useState([{ name: "Pomodori", qty: 8, min: 10, price: 1.5 }]),
    [name, setName] = useState(""),
    [qty, setQty] = useState("5"),
    [min, setMin] = useState("2"),
    [price, setPrice] = useState("3");
  const add = () => {
    if (name.trim() && Number(qty) >= 0)
      setRows((r) => [
        ...r,
        { name: name.trim(), qty: Number(qty), min: Number(min), price: Number(price) },
      ]);
    setName("");
  };
  const total = rows.reduce((s, r) => s + r.qty * r.price, 0);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-medium text-muted-foreground">
          Prodotto
          <input
            aria-label="Nome prodotto"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
          />
        </label>
        <NumberField id="inventory-qty" label="Quantità" value={qty} onChange={setQty} />
        <NumberField id="inventory-min" label="Scorta minima" value={min} onChange={setMin} />
        <NumberField
          id="inventory-price"
          label="Costo unitario"
          unit="€"
          value={price}
          onChange={setPrice}
        />
      </div>
      <Button type="button" onClick={add}>
        Inserisci riga
      </Button>
      <table className="w-full text-xs">
        <caption className="mb-1 text-left font-semibold">Registro prodotti locale</caption>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.name}-${i}`}>
              <td className="p-1">{r.name}</td>
              <td className="p-1">{r.qty} u.</td>
              <td className="p-1">{r.qty < r.min ? "Sotto scorta" : "OK"}</td>
              <td>
                <button
                  type="button"
                  aria-label={`Rimuovi ${r.name}`}
                  onClick={() => setRows((x) => x.filter((_, j) => j !== i))}
                  className="text-danger underline"
                >
                  Rimuovi
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p role="status">
        Valore inventario: <strong>{total.toFixed(2)} €</strong>
      </p>
    </div>
  );
}
function HospitalityLab() {
  const [rooms, setRooms] = useState("20"),
    [bookings, setBookings] = useState("14"),
    [checked, setChecked] = useState("10"),
    [revenue, setRevenue] = useState("850");
  const r = Number(rooms),
    b = Number(bookings),
    c = Number(checked),
    rev = Number(revenue);
  const occ = r > 0 ? (c / r) * 100 : 0,
    adr = c > 0 ? rev / c : 0;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <NumberField id="hotel-rooms" label="Camere totali" value={rooms} onChange={setRooms} />
        <NumberField
          id="hotel-bookings"
          label="Prenotazioni"
          value={bookings}
          onChange={setBookings}
        />
        <NumberField
          id="hotel-checkin"
          label="Check-in attivi"
          value={checked}
          onChange={setChecked}
        />
        <NumberField
          id="hotel-revenue"
          label="Ricavo simulato"
          unit="€"
          value={revenue}
          onChange={setRevenue}
        />
      </div>
      <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm">
        Disponibilità: <strong>{Math.max(0, r - b)} camere</strong> · occupazione:{" "}
        <strong>{occ.toFixed(1)}%</strong> · ADR: <strong>{adr.toFixed(2)} €</strong>
      </p>
      <p className="text-xs text-muted-foreground">
        Scenario locale di prenotazioni e check-in; nessun dato ospite o PMS esterno.
      </p>
    </div>
  );
}
function TravelItineraryLab() {
  const [stops, setStops] = useState("3"),
    [days, setDays] = useState("5"),
    [cost, setCost] = useState("180"),
    [fee, setFee] = useState("40");
  const total = Number(stops) * Number(cost) + Number(fee);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <NumberField id="trip-stops" label="Tappe" value={stops} onChange={setStops} />
        <NumberField id="trip-days" label="Giorni" value={days} onChange={setDays} />
        <NumberField
          id="trip-cost"
          label="Costo per tappa"
          unit="€"
          value={cost}
          onChange={setCost}
        />
        <NumberField id="trip-fee" label="Servizi fissi" unit="€" value={fee} onChange={setFee} />
      </div>
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        {Array.from({ length: Math.max(0, Math.min(12, Number(stops) || 0)) }, (_, i) => (
          <li key={i}>
            Giorno {Math.min(Number(days) || 1, i + 1)} · Tappa {i + 1} ·{" "}
            {(Number(cost) || 0).toFixed(2)} €
          </li>
        ))}
      </ol>
      <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm">
        Preventivo itinerario: <strong>{total.toFixed(2)} €</strong> · durata:{" "}
        <strong>{days} giorni</strong>
      </p>
      <p className="text-xs text-muted-foreground">
        Pianificazione didattica delle tappe; non duplica il calcolo del budget di viaggio.
      </p>
    </div>
  );
}

function GeoSurveyLab() {
  const [mode, setMode] = useState("coordinates");
  const [a, setA] = useState("10");
  const [b, setB] = useState("20");
  const [c, setC] = useState("30");
  const n: [number, number, number] = [Number(a), Number(b), Number(c)];
  const finite = [a, b, c].every((value) => value.trim() !== "") && n.every(Number.isFinite);
  let result = "Inserisci valori validi per iniziare.";
  if (finite) {
    if (mode === "coordinates")
      result = `Distanza planimetrica: ${Math.hypot(n[2] - n[0], n[1] - n[0]).toFixed(2)} u`;
    if (mode === "triangulation")
      result = `Lato stimato (triangolazione didattica): ${Math.sqrt(Math.max(0, n[0] ** 2 + n[1] ** 2 - 2 * n[0] * n[1] * Math.cos((n[2] * Math.PI) / 180))).toFixed(2)} u`;
    if (mode === "slope")
      result = `Dislivello: ${(n[1] - n[0]).toFixed(2)} m · pendenza: ${n[2] !== 0 ? (((n[1] - n[0]) / n[2]) * 100).toFixed(2) : "—"}%`;
    if (mode === "surface")
      result = `Superficie: ${(n[0] * n[1]).toFixed(2)} m² · volume: ${(n[0] * n[1] * n[2]).toFixed(2)} m³`;
  }
  const values: [string, string, string] = [a, b, c];
  const setters: [(value: string) => void, (value: string) => void, (value: string) => void] = [
    setA,
    setB,
    setC,
  ];
  const labels =
    mode === "coordinates"
      ? ["X punto A", "Y punto A", "X punto B"]
      : mode === "triangulation"
        ? ["Lato 1", "Lato 2", "Angolo compreso"]
        : mode === "slope"
          ? ["Quota iniziale", "Quota finale", "Distanza orizzontale"]
          : ["Lunghezza", "Larghezza", "Altezza"];
  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Modalità rilievo
        <select
          aria-label="Modalità geo-survey"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
        >
          <option value="coordinates">Coordinate</option>
          <option value="triangulation">Triangolazione</option>
          <option value="slope">Pendenze e dislivelli</option>
          <option value="surface">Superfici e volumi</option>
        </select>
      </label>
      <div className="grid grid-cols-3 gap-2">
        {labels.map((label, i) => (
          <NumberField
            key={label}
            id={`geo-${i}`}
            label={label}
            value={values[i] ?? ""}
            onChange={setters[i] ?? setA}
          />
        ))}
      </div>
      {finite ? (
        <p
          role="status"
          aria-label="Risultato geo-survey"
          className="rounded-xl bg-primary-soft p-3 text-sm"
        >
          <strong>{result}</strong>
        </p>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Inserisci solo numeri finiti e una distanza diversa da zero quando richiesta.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Modello locale per esercitazione: controlla sempre unità, segni e convenzioni del rilievo
        reale.
      </p>
    </div>
  );
}

function NavigationLab() {
  const [mode, setMode] = useState("route"),
    [nodes, setNodes] = useState("A → B → C"),
    [distance, setDistance] = useState("120"),
    [speed, setSpeed] = useState("30"),
    [fuel, setFuel] = useState("600"),
    [consumption, setConsumption] = useState("20");
  const d = Number(distance),
    v = Number(speed),
    f = Number(fuel),
    q = Number(consumption),
    valid = [d, v, f, q].every(Number.isFinite) && d >= 0 && v > 0 && f >= 0 && q > 0;
  const result =
    mode === "route"
      ? `Nodi/waypoint: ${nodes || "—"} · tempo: ${(d / v).toFixed(2)} h · distanza: ${d.toFixed(1)} km`
      : mode === "coordinates"
        ? `Coordinate/rotta: ${nodes || "—"} · distanza da verificare sul piano di navigazione`
        : `Autonomia: ${(f / q).toFixed(1)} h · percorrenza teorica: ${((f / q) * v).toFixed(1)} km`;
  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Modulo
        <select
          aria-label="Modulo navigation lab"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
        >
          <option value="route">Nodi, waypoint e rotta</option>
          <option value="coordinates">Coordinate e controllo rotta</option>
          <option value="autonomy">Autonomia</option>
        </select>
      </label>
      <label className="block text-xs font-medium text-muted-foreground">
        Nodi / waypoint
        <input
          aria-label="Nodi e waypoint"
          maxLength={120}
          value={nodes}
          onChange={(e) => setNodes(e.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          id="nav-distance"
          label="Distanza"
          unit="km"
          value={distance}
          onChange={setDistance}
        />
        <NumberField
          id="nav-speed"
          label="Velocità"
          unit="km/h"
          value={speed}
          onChange={setSpeed}
        />
        <NumberField
          id="nav-fuel"
          label="Autonomia disponibile"
          unit="unità"
          value={fuel}
          onChange={setFuel}
        />
        <NumberField
          id="nav-consumption"
          label="Consumo orario"
          unit="unità/h"
          value={consumption}
          onChange={setConsumption}
        />
      </div>
      {valid ? (
        <p
          role="status"
          aria-label="Risultato navigation lab"
          className="rounded-xl bg-primary-soft p-3 text-sm"
        >
          <strong>{result}</strong>
        </p>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Usa distanza non negativa, velocità e consumo positivi.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Laboratorio teorico offline: il route planner resta il riferimento per la distanza tra due
        coordinate; qui si esercitano nodi, waypoints e autonomia senza duplicarlo.
      </p>
    </div>
  );
}

const CLASSICS_CARDS = [
  { front: "amo, amas, amare", back: "1ª coniugazione · paradigma" },
  { front: "rosa, rosae", back: "1ª declinazione · genitivo singolare" },
  { front: "λύω, λύεις", back: "presente attivo · paradigma greco" },
];
function LanguageClassicsLab() {
  const [mode, setMode] = useState("flashcards"),
    [card, setCard] = useState(0),
    [reveal, setReveal] = useState(false),
    [sentence, setSentence] = useState("Puella rosam amat."),
    [translation, setTranslation] = useState("");
  const currentCard = CLASSICS_CARDS[card] ?? { front: "", back: "" };
  const prompt =
    mode === "flashcards"
      ? reveal
        ? currentCard.back
        : currentCard.front
      : mode === "analysis"
        ? "Soggetto · verbo · complemento oggetto: individua caso e funzione"
        : "Suggerimento: cerca prima il verbo, poi soggetto e complementi.";
  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Modalità
        <select
          aria-label="Modalità classici"
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            setReveal(false);
          }}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
        >
          <option value="flashcards">Flashcard paradigmi e declinazioni</option>
          <option value="analysis">Analisi guidata della frase</option>
          <option value="translation">Traduzione con suggerimenti</option>
        </select>
      </label>
      {mode === "flashcards" && (
        <>
          <div className="rounded-xl bg-surface p-4">
            <p className="text-lg font-semibold">{prompt}</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={() => setReveal((v) => !v)}>
              {reveal ? "Nascondi" : "Rivela"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCard((card + 1) % CLASSICS_CARDS.length);
                setReveal(false);
              }}
            >
              Prossima carta
            </Button>
          </div>
        </>
      )}
      {mode === "analysis" && (
        <>
          <label className="block text-xs font-medium text-muted-foreground">
            Frase
            <input
              aria-label="Frase da analizzare"
              maxLength={160}
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
            />
          </label>
          <p
            role="status"
            aria-label="Guida analisi frase"
            className="rounded-xl bg-primary-soft p-3 text-sm"
          >
            {prompt}
            <br />
            <span className="text-xs text-muted-foreground">Frase: {sentence || "—"}</span>
          </p>
        </>
      )}
      {mode === "translation" && (
        <>
          <label className="block text-xs font-medium text-muted-foreground">
            Prova traduzione
            <textarea
              aria-label="Traduzione guidata"
              maxLength={300}
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              className="mt-1 min-h-24 w-full rounded-xl border border-input bg-card p-3 text-sm"
            />
          </label>
          <p
            role="status"
            aria-label="Suggerimento traduzione"
            className="rounded-xl bg-primary-soft p-3 text-sm"
          >
            {prompt}
          </p>
        </>
      )}
      <p className="text-xs text-muted-foreground">
        Supporto didattico locale: offre tracce e suggerimenti, non promette un’analisi automatica
        perfetta.
      </p>
    </div>
  );
}

const PRACTICE_ITEMS = [
  { word: "sostenibile", answer: "sustainable" },
  { word: "although", answer: "sebbene" },
  { word: "to improve", answer: "migliorare" },
];
function LanguagePracticeLab() {
  const [mode, setMode] = useState("lexicon"),
    [index, setIndex] = useState(0),
    [answer, setAnswer] = useState("");
  const item = PRACTICE_ITEMS[index] ?? { word: "", answer: "" };
  const feedback = answer.trim()
    ? answer.trim().toLocaleLowerCase("it-IT") === item.answer
      ? "Risposta corretta: prova a usarla in una frase."
      : `Suggerimento: ${item.answer}`
    : "Inserisci una risposta per ricevere un feedback locale.";
  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Esercizio
        <select
          aria-label="Tipo esercizio linguistico"
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            setAnswer("");
          }}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
        >
          <option value="lexicon">Lessico</option>
          <option value="grammar">Grammatica</option>
          <option value="translation">Traduzione guidata</option>
        </select>
      </label>
      <div className="rounded-xl bg-surface p-4">
        <p className="text-xs text-muted-foreground">
          {mode === "lexicon"
            ? "Traduci"
            : mode === "grammar"
              ? "Completa: If I ___ time, I would read."
              : "Rendi in italiano: The student is learning."}
        </p>
        <p className="mt-1 text-lg font-semibold">
          {mode === "lexicon"
            ? item.word
            : mode === "grammar"
              ? "had"
              : "suggerimento: cerca soggetto e verbo"}
        </p>
      </div>
      <label className="block text-xs font-medium text-muted-foreground">
        Risposta
        <input
          aria-label="Risposta esercizio linguistico"
          maxLength={160}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
        />
      </label>
      <div className="flex gap-2">
        <Button type="button" onClick={() => setIndex((index + 1) % PRACTICE_ITEMS.length)}>
          Prossimo
        </Button>
      </div>
      <p
        role="status"
        aria-label="Feedback esercizio linguistico"
        className="rounded-xl bg-primary-soft p-3 text-sm"
      >
        {feedback}
      </p>
      <p className="text-xs text-muted-foreground">
        Dataset locale per esercitazione; nessun servizio esterno e nessuna correzione automatica
        completa.
      </p>
    </div>
  );
}

function DesignLab() {
  const [mode, setMode] = useState("palette"),
    [subject, setSubject] = useState("Poster didattico");
  const guidance =
    mode === "palette"
      ? "Scegli una dominante, un contrasto e verifica la leggibilità."
      : mode === "type"
        ? "Abbina un carattere per titoli e uno per testo; limita le gerarchie."
        : "Definisci griglia, margini e proporzione prima di inserire gli elementi.";
  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Modalità design
        <select
          aria-label="Modalità design"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
        >
          <option value="palette">Colore e palette</option>
          <option value="type">Tipografia</option>
          <option value="layout">Impaginazione e proporzioni</option>
        </select>
      </label>
      <label className="block text-xs font-medium text-muted-foreground">
        Elaborato
        <input
          aria-label="Titolo elaborato design"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={80}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
        />
      </label>
      <p role="status" aria-label="Guida design" className="rounded-xl bg-primary-soft p-3 text-sm">
        <strong>{subject || "Elaborato"}</strong> · {guidance}
      </p>
      <p className="text-xs text-muted-foreground">
        Laboratorio concettuale: non sostituisce la verifica su supporto, stampa o profilo colore.
      </p>
    </div>
  );
}

const SHOT_TYPES = ["Campo lungo", "Campo medio", "Primo piano", "Dettaglio"];
function MediaStoryboardLab() {
  const [scene, setScene] = useState("1"),
    [shot, setShot] = useState(SHOT_TYPES[1]),
    [duration, setDuration] = useState("8"),
    [audio, setAudio] = useState("Ambiente");
  const valid = Number(duration) >= 0 && Number.isFinite(Number(duration));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-medium text-muted-foreground">
          Scena
          <input
            aria-label="Numero scena"
            value={scene}
            onChange={(e) => setScene(e.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
          />
        </label>
        <label className="block text-xs font-medium text-muted-foreground">
          Inquadratura
          <select
            aria-label="Tipo inquadratura"
            value={shot}
            onChange={(e) => setShot(e.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
          >
            {SHOT_TYPES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <NumberField
          id="story-duration"
          label="Durata"
          unit="s"
          value={duration}
          onChange={setDuration}
        />
        <label className="block text-xs font-medium text-muted-foreground">
          Audio
          <select
            aria-label="Audio scena"
            value={audio}
            onChange={(e) => setAudio(e.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
          >
            <option>Ambiente</option>
            <option>Dialogo</option>
            <option>Musica</option>
            <option>Silenzio</option>
          </select>
        </label>
      </div>
      {valid ? (
        <p
          role="status"
          aria-label="Shot-list storyboard"
          className="rounded-xl bg-primary-soft p-3 text-sm"
        >
          <strong>Scena {scene || "—"}</strong> · {shot} · {duration} s · audio: {audio}
        </p>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Inserisci una durata numerica non negativa.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Shot-list locale: aggiungi le scene una alla volta e verifica continuità, diritti audio e
        accessibilità.
      </p>
    </div>
  );
}

function FashionLab() {
  const [bust, setBust] = useState("88"),
    [length, setLength] = useState("70"),
    [width, setWidth] = useState("140"),
    [pieces, setPieces] = useState("2"),
    [waste, setWaste] = useState("10");
  const b = Number(bust),
    l = Number(length),
    w = Number(width),
    n = Number(pieces),
    q = Number(waste);
  const valid =
    [b, l, w, n, q].every(Number.isFinite) && b > 0 && l > 0 && w > 0 && n > 0 && q >= 0;
  const consumption = valid ? (l * n * (1 + q / 100)) / 100 : 0;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          id="fashion-bust"
          label="Circonferenza torace"
          unit="cm"
          value={bust}
          onChange={setBust}
        />
        <NumberField
          id="fashion-length"
          label="Lunghezza capo"
          unit="cm"
          value={length}
          onChange={setLength}
        />
        <NumberField
          id="fashion-width"
          label="Altezza tessuto"
          unit="cm"
          value={width}
          onChange={setWidth}
        />
        <NumberField
          id="fashion-pieces"
          label="Pezzi principali"
          value={pieces}
          onChange={setPieces}
        />
        <NumberField
          id="fashion-waste"
          label="Margine taglio"
          unit="%"
          value={waste}
          onChange={setWaste}
        />
      </div>
      {valid ? (
        <p
          role="status"
          aria-label="Risultato fashion lab"
          className="rounded-xl bg-primary-soft p-3 text-sm"
        >
          Proporzione guida torace: <strong>{(b / 2).toFixed(1)} cm</strong> · consumo stimato:{" "}
          <strong>{consumption.toFixed(2)} m</strong> · piazzamento su altezza {w} cm.
        </p>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Inserisci misure positive e margine non negativo.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Stima semplificata: non sostituisce cartamodello, prova, verso del tessuto o scheda tecnica.
      </p>
    </div>
  );
}

function DentalMaterialsLab() {
  const [mode, setMode] = useState("anatomy");
  const text =
    mode === "anatomy"
      ? "Riconosci arcata, cuspidi e superfici prima del modello."
      : mode === "occlusion"
        ? "Controlla contatti, intercuspidazione e guida in modo descrittivo."
        : mode === "materials"
          ? "Confronta gesso, resina e ceramica in base alla fase didattica."
          : "Sequenza: impronta → modello → progettazione → protesi → controllo.";
  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Modulo
        <select
          aria-label="Modulo dental materials"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
        >
          <option value="anatomy">Anatomia</option>
          <option value="occlusion">Occlusione guidata</option>
          <option value="materials">Materiali</option>
          <option value="workflow">Workflow impronta-modello-protesi</option>
        </select>
      </label>
      <p
        role="status"
        aria-label="Guida dental materials"
        className="rounded-xl bg-primary-soft p-3 text-sm"
      >
        <strong>{text}</strong>
      </p>
      <p className="text-xs text-muted-foreground">
        Solo didattico: non è diagnosi, prescrizione, progettazione clinica o indicazione operativa
        per pazienti.
      </p>
    </div>
  );
}

function SocialResearchLab() {
  const [question, setQuestion] = useState("Come valuti il servizio?");
  const [counts, setCounts] = useState("12, 8, 5, 3");
  const values = counts
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((x) => Number.isFinite(x) && x >= 0);
  const total = values.reduce((a, x) => a + x, 0);
  const max = Math.max(...values, 1);
  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Domanda del questionario
        <input
          aria-label="Domanda questionario"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={120}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
        />
      </label>
      <label className="block text-xs font-medium text-muted-foreground">
        Frequenze per risposta
        <input
          aria-label="Frequenze questionario"
          value={counts}
          onChange={(e) => setCounts(e.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
        />
      </label>
      <p
        role="status"
        aria-label="Risultato ricerca sociale"
        className="rounded-xl bg-primary-soft p-3 text-sm"
      >
        <strong>{question || "Domanda"}</strong> · {total} risposte locali
      </p>
      <ul aria-label="Grafico frequenze" className="space-y-2">
        {values.map((value, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            <span className="w-16">Opzione {i + 1}</span>
            <span className="h-3 rounded bg-primary" style={{ width: `${(value / max) * 100}%` }} />
            <span>
              {value} · {total ? ((value / total) * 100).toFixed(1) : "0.0"}%
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Campione dimostrativo offline: descrivi numerosità, frequenze e percentuali; non inferire
        causalità da questo grafico.
      </p>
    </div>
  );
}

function ViticultureTraceabilityLab() {
  const [lot, setLot] = useState("VG-001"),
    [grapes, setGrapes] = useState("1000"),
    [wine, setWine] = useState("650"),
    [sugar, setSugar] = useState("20"),
    [ph, setPh] = useState("3.4"),
    [fermentation, setFermentation] = useState("Avviata");
  const g = Number(grapes),
    v = Number(wine),
    valid = [g, v, Number(sugar), Number(ph)].every(Number.isFinite) && g > 0 && v >= 0;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-medium text-muted-foreground">
          Lotto
          <input
            aria-label="Codice lotto"
            value={lot}
            onChange={(e) => setLot(e.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
          />
        </label>
        <NumberField
          id="trace-grapes"
          label="Uva conferita"
          unit="kg"
          value={grapes}
          onChange={setGrapes}
        />
        <NumberField
          id="trace-wine"
          label="Mosto/vino ottenuto"
          unit="L"
          value={wine}
          onChange={setWine}
        />
        <NumberField
          id="trace-sugar"
          label="Zuccheri"
          unit="°Brix"
          value={sugar}
          onChange={setSugar}
        />
        <NumberField id="trace-ph" label="pH" value={ph} onChange={setPh} />
        <label className="block text-xs font-medium text-muted-foreground">
          Fermentazione
          <select
            aria-label="Stato fermentazione"
            value={fermentation}
            onChange={(e) => setFermentation(e.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
          >
            <option>Non avviata</option>
            <option>Avviata</option>
            <option>Conclusa</option>
          </select>
        </label>
      </div>
      {valid ? (
        <p
          role="status"
          aria-label="Risultato tracciabilità viticola"
          className="rounded-xl bg-primary-soft p-3 text-sm"
        >
          Lotto <strong>{lot || "—"}</strong> · resa: <strong>{((v / g) * 100).toFixed(1)}%</strong>{" "}
          · fermentazione: {fermentation}
        </p>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Inserisci massa positiva e volume non negativo.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Estensione dell’agronomy lab: aggiunge tracciabilità e controlli di processo; dati simulati,
        non registro normativo.
      </p>
    </div>
  );
}

function SafetyLab() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const items = SAFETY_CHECKLIST.flatMap(({ category, items: categoryItems }) =>
    categoryItems.map((label) => ({ category, label, id: `${category}-${label}` })),
  );
  const completed = items.filter(({ id }) => checked[id]).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-xl bg-primary-soft p-3">
        <p role="status" aria-label="Completamento checklist" className="text-sm font-semibold">
          {completed} / {items.length} completate
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => setChecked({})}>
          Azzera checklist
        </Button>
      </div>
      <div className="space-y-3">
        {SAFETY_CHECKLIST.map(({ category, items: categoryItems }) => (
          <fieldset key={category} className="rounded-xl border border-border p-3">
            <legend className="px-1 text-xs font-semibold">{category}</legend>
            <div className="space-y-2">
              {categoryItems.map((label) => {
                const id = `${category}-${label}`;
                return (
                  <label key={id} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(checked[id])}
                      onChange={(event) =>
                        setChecked((current) => ({ ...current, [id]: event.target.checked }))
                      }
                      className="mt-0.5 h-4 w-4 accent-primary"
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <p
        role="note"
        className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-5"
      >
        Attività didattica locale: non sostituisce procedure ufficiali, regolamenti, valutazioni del
        rischio o istruzioni del personale responsabile.
      </p>
    </div>
  );
}

function ToolContent({ id }: { id: ToolId }) {
  if (id === "electronics-lab") return <ElectronicsLab />;
  if (id === "signal-lab") return <SignalLab />;
  if (id === "automation-lab") return <AutomationLab />;
  if (id === "chemistry-lab") return <ChemistryLab />;
  if (id === "biotech-lab") return <BiotechLab />;
  if (id === "physics-lab") return <PhysicsLab />;
  if (id === "waves-optics-lab") return <WavesOpticsLab />;
  if (id === "business-lab") return <BusinessLab />;
  if (id === "inventory-lab") return <InventoryLab />;
  if (id === "hospitality-lab") return <HospitalityLab />;
  if (id === "travel-itinerary-lab") return <TravelItineraryLab />;
  if (id === "geo-survey-lab") return <GeoSurveyLab />;
  if (id === "navigation-lab") return <NavigationLab />;
  if (id === "language-classics-lab") return <LanguageClassicsLab />;
  if (id === "language-practice-lab") return <LanguagePracticeLab />;
  if (id === "design-lab") return <DesignLab />;
  if (id === "media-storyboard-lab") return <MediaStoryboardLab />;
  if (id === "fashion-lab") return <FashionLab />;
  if (id === "dental-materials-lab") return <DentalMaterialsLab />;
  if (id === "social-research-lab") return <SocialResearchLab />;
  if (id === "viticulture-traceability-lab") return <ViticultureTraceabilityLab />;
  if (id === "safety-lab") return <SafetyLab />;
  if (id === "web-lab") return <WebLab />;
  if (id === "code-lab") return <CodeLab />;
  if (id === "sql-lab") return <SqlLab />;
  if (id === "math-lab") return <MathLab />;
  if (id === "molarity-lab") return <MolarityLab />;
  if (id === "ph-lab") return <PhLab />;
  if (id === "statistics-lab") return <StatisticsLab />;
  if (id === "route-planner") return <RoutePlanner />;
  if (id === "food-cost") return <FoodCost />;
  if (id === "ledger-cashflow") return <LedgerCashflow />;
  if (id === "sql-schema") return <SqlSchema />;
  if (id === "agronomy-lab") return <AgronomyLab />;
  if (id === "plc-troubleshooter") return <PlcTroubleshooter />;
  if (id === "language-cards") return <LanguageCards />;
  if (id === "creative-planner") return <CreativePlanner />;
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

type SchoolId = "morselli-sturzo" | "majorana" | "eschilo" | "vittorini";

const SCHOOL_KEY = "voto.study-tools-shop.school.v1";
const FAVORITE_SCHOOLS_KEY = "voto.study-tools-shop.favorite-schools.v1";
const FAVORITE_TRACKS_KEY = "voto.study-tools-shop.favorite-tracks.v1";

const SCHOOL_LABELS: Record<SchoolId, string> = {
  "morselli-sturzo": "IIS E. Morselli - L. Sturzo",
  majorana: "IIS E. Majorana",
  eschilo: 'IIS "Eschilo"',
  vittorini: 'Liceo Scientifico e Linguistico "E. Vittorini"',
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
  eschilo: ["classico-eschilo", "scienze-umane-eschilo", "economico-sociale-eschilo"],
  vittorini: [
    "scientifico-vittorini",
    "linguistico-vittorini",
    "scienze-applicate-vittorini",
    "tred-vittorini",
    "biomedica-vittorini",
  ],
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
    return CATALOG_TOOLS.filter((tool) => {
      const matchesTrack = tool.track === track;
      const matchesSearch =
        !query ||
        `${tool.title} ${tool.description} ${tool.label}`
          .toLocaleLowerCase("it-IT")
          .includes(query);
      return matchesTrack && matchesSearch;
    });
  }, [search, track]);
  const selectedTool = CATALOG_TOOLS.find(
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
