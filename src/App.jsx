import HexMap from './components/HexMap.jsx';
import TopBar from './components/TopBar.jsx';
import SelectedPanel from './components/SelectedPanel.jsx';
import EndTurnButton from './components/EndTurnButton.jsx';
import TechButton from './components/TechButton.jsx';
import TechModal from './components/TechModal.jsx';

export default function App() {
  return (
    <div className="app">
      <TopBar />
      <HexMap />
      <EndTurnButton />
      <TechButton />
      <SelectedPanel />
      <TechModal />
    </div>
  );
}
