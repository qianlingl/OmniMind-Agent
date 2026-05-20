import FileExplorer from '../components/FileExplorer';

export default function FilesPage() {
  return (
    <div className="page">
      <div className="page-header">
        <h1 style={{ margin: 0 }}>文件管理</h1>
        <p className="page-subtitle">上传、查看和管理你的文件</p>
      </div>
      <FileExplorer />
    </div>
  );
}
