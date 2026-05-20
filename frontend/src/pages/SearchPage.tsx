import SearchPanel from '../components/SearchPanel';

export default function SearchPage() {
  return (
    <div className="page">
      <div className="page-header">
        <h1 style={{ margin: 0 }}>网络搜索</h1>
        <p className="page-subtitle">搜索最新资讯和网络资源</p>
      </div>
      <SearchPanel />
    </div>
  );
}
