import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import './App.css'
import { Home } from './pages/Home'
import { ArtistDetail } from './pages/ArtistDetail'
import { ArtworkDetail } from './pages/ArtworkDetail'
import { PeriodDetail } from './pages/PeriodDetail'
import { OrganizationDetail } from './pages/OrganizationDetail'
import { Timeline } from './pages/Timeline'
import { Explore } from './pages/Explore'
import { Search } from './pages/Search'
import { Artists } from './pages/Artists'
import { Artworks } from './pages/Artworks'
import { Games } from './pages/Games'
import { Favorites } from './pages/Favorites'
import { Stats } from './pages/Stats'
import { SearchBar } from './components/shared/SearchBar'
import { ThemeToggle } from './components/shared/ThemeToggle'
import { FavoritesProvider } from './contexts/FavoritesContext'
import { ThemeProvider } from './contexts/ThemeContext'

function App() {
  return (
    <ThemeProvider>
      <FavoritesProvider>
      <Router>
      <div className="app">
        <header className="header">
          <div className="header-top">
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <h1>VeriArt</h1>
            </Link>
            <nav className="header-nav">
              <Link to="/artists" className="nav-link">艺术家</Link>
              <Link to="/artworks" className="nav-link">作品</Link>
              <Link to="/timeline" className="nav-link">时间线</Link>
              <Link to="/explore" className="nav-link">探索</Link>
              <Link to="/games" className="nav-link">游戏</Link>
              <Link to="/favorites" className="nav-link">收藏</Link>
              <Link to="/stats" className="nav-link">统计</Link>
            </nav>
            <div className="header-actions">
              <SearchBar />
              <ThemeToggle />
            </div>
          </div>
          <p className="tagline">在艺术与时间的流转中，以智能与可信技术为线索，追踪作品的来历与脉络，汇聚多源信息与数字印记，呈现可追溯、可印证的清晰依据，让每一次判断都建立在被看见的真实之上。</p>
        </header>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/artists" element={<Artists />} />
          <Route path="/artworks" element={<Artworks />} />
          <Route path="/artist/:id" element={<ArtistDetail />} />
          <Route path="/artwork/:id" element={<ArtworkDetail />} />
          <Route path="/period/:id" element={<PeriodDetail />} />
          <Route path="/organization/:id" element={<OrganizationDetail />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/search" element={<Search />} />
          <Route path="/games" element={<Games />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/stats" element={<Stats />} />
        </Routes>
      </div>
    </Router>
    </FavoritesProvider>
    </ThemeProvider>
  )
}

export default App
