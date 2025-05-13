import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Table, Select, Typography, Space, message, Badge, InputNumber } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import MultiDatePicker, { DateObject } from 'react-multi-date-picker';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';

const { Text } = Typography;

// Add custom CSS to match SupermarketManagement styling
const playlistManagementStyles = `
  .playlist-table .ant-table-thead > tr > th {
    background: #fafafa;
    font-size: 14px;
    font-weight: 500;
    color: #333;
    text-align: center;
    padding: 12px 8px;
  }
  .playlist-table .ant-table-tbody > tr > td {
    font-size: 14px;
    color: #4a4a4a;
    text-align: center;
    padding: 12px 8px;
  }
  .playlist-table .ant-table-tbody > tr:hover > td {
    background: #f5f5f5;
  }
  .ant-table-wrapper {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
  }
  .ant-table-container {
    overflow-x: auto;
  }
  .ant-select-selector {
    border-radius: 6px !important;
  }
  .ant-input {
    border-radius: 6px !important;
  }
  .ant-btn {
    border-radius: 6px;
  }
  .custom-card {
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  .custom-card .ant-card-body {
    padding: 24px;
  }
`;

const PlaylistManagement: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [selectedDates, setSelectedDates] = useState<DateObject[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | undefined>(undefined);
  const [audioFiles, setAudioFiles] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [playlistItems, setPlaylistItems] = useState<any[]>([]);
  const [audioGroups, setAudioGroups] = useState<any[]>([]);
  const [selectedPlaylistRowKeys, setSelectedPlaylistRowKeys] = useState<React.Key[]>([]);
  const [selectedAudioRowKeys, setSelectedAudioRowKeys] = useState<React.Key[]>([]);
  const [audioSearch, setAudioSearch] = useState('');
  const [audioGroupFilter, setAudioGroupFilter] = useState<number[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalFiles, setAddModalFiles] = useState<any[]>([]);
  const [addFrequency, setAddFrequency] = useState<number | undefined>(undefined);
  const [addTimeSlot, setAddTimeSlot] = useState('');
  const [editMode, setEditMode] = useState<'add' | 'edit-single' | 'edit-multi'>('add');
  const [editIndexes, setEditIndexes] = useState<number[]>([]);
  const [audioPage, setAudioPage] = useState(1);
  const [audioPageSize, setAudioPageSize] = useState(10);
  const [audioTotal, setAudioTotal] = useState(0);
  const [playlistPage, setPlaylistPage] = useState(1);
  const [playlistPageSize, setPlaylistPageSize] = useState(10);
  const [playlistTotal, setPlaylistTotal] = useState(0);
  const [localAudioFiles, setLocalAudioFiles] = useState<any[]>([]);
  const [localPlaylistItems, setLocalPlaylistItems] = useState<any[]>([]);
  const [allAudioFiles, setAllAudioFiles] = useState<any[]>([]);

  const currentPlaylist = playlists.find((p: any) => p.id === selectedPlaylistId);

  const prevPlaylistIdRef = React.useRef<number | undefined>(undefined);
  useEffect(() => {
    if (prevPlaylistIdRef.current !== selectedPlaylistId) {
      if (currentPlaylist && currentPlaylist.audios) {
        setPlaylistItems(currentPlaylist.audios);
        setLocalPlaylistItems(currentPlaylist.audios);
      } else {
        setPlaylistItems([]);
        setLocalPlaylistItems([]);
      }
      prevPlaylistIdRef.current = selectedPlaylistId;
    }
  }, [currentPlaylist, selectedPlaylistId]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.append('page', audioPage.toString());
    params.append('limit', audioPageSize.toString());
    fetch(`/api/audio-files?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        const newAudioFiles = data.audioFiles || (Array.isArray(data) ? data : []);
        const filteredFiles = newAudioFiles.filter((file: any) => 
          !localPlaylistItems.some((item: any) => item.id === file.id)
        );
        setAudioFiles(filteredFiles);
        setLocalAudioFiles(filteredFiles);
        if (data.pagination) setAudioTotal(data.pagination.total);
        setLoading(false);
      });
  }, [audioPage, audioPageSize, localPlaylistItems]);

  useEffect(() => {
    setLocalPlaylistItems(playlistItems);
  }, [playlistItems]);

  const fetchPlaylists = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.append('page', playlistPage.toString());
    params.append('limit', playlistPageSize.toString());
    fetch(`/api/broadcast-programs?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setPlaylists(Array.isArray(data) ? data : []);
        if (data.pagination) setPlaylistTotal(data.pagination.total);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(fetchPlaylists, [playlistPage, playlistPageSize]);

  useEffect(() => {
    fetch('/api/audio-groups')
      .then(res => res.json())
      .then(data => setAudioGroups(data || []));
  }, []);

  useEffect(() => {
    fetch('/api/audio-files?limit=10000')
      .then(res => res.json())
      .then(data => {
        setAllAudioFiles(data.audioFiles || []);
      });
  }, []);

  const handleCreatePlaylist = async () => {
    if (!playlistName || !selectedDates.length) {
      message.error('Vui lòng nhập tên và chọn ít nhất 1 ngày phát sóng!');
      return;
    }
    const dates = selectedDates.map(d => {
      if (typeof d === 'string' || d instanceof Date) return dayjs(d).format('YYYY-MM-DD');
      if (d && typeof d.format === 'function') return d.format('YYYY-MM-DD');
      return '';
    }).filter(Boolean);
    setLoading(true);
    try {
      const res = await fetch('/api/broadcast-programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playlistName, dates })
      });
      if (!res.ok) throw new Error('Tạo playlist thất bại');
      setShowModal(false);
      setPlaylistName('');
      setSelectedDates([]);
      fetchPlaylists();
      message.success('Tạo playlist thành công!');
    } catch (e) {
      message.error('Tạo playlist thất bại!');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAudioToPlaylist = (audio: any) => {
    setLocalAudioFiles(prev => prev.filter(f => f.id !== audio.id));
    openAddModal([audio]);
  };

  const handleAutoGeneratePlaylist = () => {
    const newPlaylistItems = audioFiles.map((audio: any, idx: number) => ({
      ...audio,
      frequency: audio.frequency ?? 1,
      timeSlot: audio.timeSlot || '',
      time: `00:${(idx*2).toString().padStart(2,'0')}`
    }));
    setPlaylistItems(newPlaylistItems);
    setLocalPlaylistItems(newPlaylistItems);
    setLocalAudioFiles([]);
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getGroupName = (id: number) => {
    const group = audioGroups.find((g: any) => g.id === id);
    if (!group) return '';
    if (group.name === 'greetings') return 'Lời chào';
    if (group.name === 'promotions') return 'Khuyến mãi';
    if (group.name === 'tips') return 'Mẹo vặt';
    if (group.name === 'announcements') return 'Thông báo';
    if (group.name === 'music') return 'Nhạc';
    return group.name;
  };

  const getGroupColor = (name: string) => {
    if (name === 'Lời chào') return 'blue';
    if (name === 'Khuyến mãi') return 'orange';
    if (name === 'Mẹo vặt') return 'green';
    if (name === 'Thông báo') return 'red';
    if (name === 'Nhạc') return 'purple';
    return 'default';
  };

  const renderGroupBadge = (audioGroupId: number) => {
    const name = getGroupName(audioGroupId);
    const color = getGroupColor(name);
    return <Badge color={color} text={name} />;
  };

  const filteredAudioFiles = allAudioFiles.filter((file: any) => {
    const matchName = file.displayName.toLowerCase().includes(audioSearch.toLowerCase());
    const matchGroup = audioGroupFilter.length === 0 || audioGroupFilter.includes(file.audioGroupId);
    const notInPlaylist = !playlistItems.some((item: any) => item.id === file.id);
    return matchName && matchGroup && notInPlaylist;
  });

  const pagedAudioFiles = filteredAudioFiles.slice((audioPage - 1) * audioPageSize, audioPage * audioPageSize);

  useEffect(() => {
    const totalPage = Math.ceil(filteredAudioFiles.length / audioPageSize);
    if (audioPage > totalPage) setAudioPage(totalPage > 0 ? totalPage : 1);
  }, [filteredAudioFiles.length, audioPage, audioPageSize]);

  const audioRowSelection = {
    selectedRowKeys: selectedAudioRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => setSelectedAudioRowKeys(newSelectedRowKeys),
    columnTitle: <span>Chọn</span>,
    renderCell: (checked: boolean, record: any, index: number, originNode: React.ReactNode) => originNode,
    preserveSelectedRowKeys: true,
    hideSelectAll: false,
    getCheckboxProps: () => ({ style: { accentColor: 'var(--primary)' } }),
  };

  const playlistRowSelection = {
    selectedRowKeys: selectedPlaylistRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => setSelectedPlaylistRowKeys(newSelectedRowKeys),
    columnTitle: <span>Chọn</span>,
    renderCell: (checked: boolean, record: any, index: number, originNode: React.ReactNode) => originNode,
    preserveSelectedRowKeys: true,
    hideSelectAll: false,
    getCheckboxProps: () => ({ style: { accentColor: 'var(--primary)' } }),
  };

  const handleSelectAll = () => {
    const allFilteredFiles = filteredAudioFiles;
    setSelectedAudioRowKeys(allFilteredFiles.map(f => f.id));
  };

  const handleDeselectAll = () => setSelectedAudioRowKeys([]);

  const handleSelectAllPlaylist = () => setSelectedPlaylistRowKeys(Array.from(new Set([...selectedPlaylistRowKeys, ...playlistItems.map(f => f.id)])));
  const handleDeselectAllPlaylist = () => setSelectedPlaylistRowKeys([]);

  const handleDeleteSelectedPlaylistItems = () => {
    const removedItems = playlistItems.filter(item => selectedPlaylistRowKeys.includes(item.id));
    const updatedItems = playlistItems.filter(item => !selectedPlaylistRowKeys.includes(item.id));
    setPlaylistItems(updatedItems);
    setLocalPlaylistItems(updatedItems);
    setLocalAudioFiles(prev => [...prev, ...removedItems]);
    setAudioFiles(prev => [...prev, ...removedItems]); // Đưa file về bảng audio có sẵn
    setSelectedPlaylistRowKeys([]);
    adjustPlaylistPagination(updatedItems);
  };

  const handleDeletePlaylistItem = (id: number) => {
    const removedItem = playlistItems.find(item => item.id === id);
    if (removedItem) {
      const updatedItems = playlistItems.filter(item => item.id !== id);
      setPlaylistItems(updatedItems);
      setLocalPlaylistItems(updatedItems);
      setLocalAudioFiles(prev => [...prev, removedItem]);
      setAudioFiles(prev => [...prev, removedItem]); // Đưa file về bảng audio có sẵn
      setSelectedPlaylistRowKeys(prev => prev.filter(key => key !== id));
      adjustPlaylistPagination(updatedItems);
    }
  };

  const adjustPlaylistPagination = (items: any[]) => {
    const totalItems = items.length;
    const newPage = Math.ceil((playlistPage - 1) * playlistPageSize + 1 <= totalItems ? playlistPage : Math.max(1, Math.ceil(totalItems / playlistPageSize)));
    setPlaylistPage(newPage);
    setPlaylistTotal(totalItems);
  };

  const openAddModal = (files: any[]) => {
    setAddModalFiles(files);
    setAddFrequency(undefined);
    setAddTimeSlot('');
    setShowAddModal(true);
  };

  const handleEditPlaylistItem = (record: any, idx: number) => {
    setEditMode('edit-single');
    setAddModalFiles([record]);
    setAddFrequency(record.frequency ?? 1);
    setAddTimeSlot(record.timeSlot || '');
    setEditIndexes([idx]);
    setShowAddModal(true);
  };

  const handleEditMulti = () => {
    const indexes = playlistItems.map((item, idx) => selectedPlaylistRowKeys.includes(item.id) ? idx : -1).filter(idx => idx !== -1);
    const files = indexes.map(idx => playlistItems[idx]);
    setEditMode('edit-multi');
    setAddModalFiles(files);
    setAddFrequency(undefined);
    setAddTimeSlot('');
    setEditIndexes(indexes);
    setShowAddModal(true);
  };

  const handleAddModalOk = () => {
    if (!addModalFiles.length) return;
    if (editMode === 'edit-single' && editIndexes.length === 1) {
      const updatedItems = playlistItems.map((item, idx) => idx === editIndexes[0]
        ? { ...item, frequency: addFrequency ?? 1, timeSlot: addTimeSlot }
        : item
      );
      setPlaylistItems(updatedItems);
      setLocalPlaylistItems(updatedItems);
    } else if (editMode === 'edit-multi' && editIndexes.length > 0) {
      const updatedItems = playlistItems.map((item, idx) =>
        editIndexes.includes(idx)
          ? { ...item, frequency: addFrequency ?? item.frequency ?? 1, timeSlot: addTimeSlot }
          : item
      );
      setPlaylistItems(updatedItems);
      setLocalPlaylistItems(updatedItems);
    } else {
      const newItems = addModalFiles.map(file => ({
        ...file,
        frequency: addFrequency ?? file.frequency ?? 1,
        timeSlot: addTimeSlot,
      }));
      const updatedPlaylistItems = [...playlistItems, ...newItems];
      setPlaylistItems(updatedPlaylistItems);
      setLocalPlaylistItems(updatedPlaylistItems);
      setLocalAudioFiles(prev => prev.filter(f => !addModalFiles.some(a => a.id === f.id)));
      setAudioFiles(prev => prev.filter(f => !addModalFiles.some(a => a.id === f.id)));
      setSelectedAudioRowKeys(prev => prev.filter(id => !addModalFiles.some(f => f.id === id)));
    }
    setShowAddModal(false);
    setSelectedAudioRowKeys([]);
    setEditIndexes([]);
    setEditMode('add');
  };

  const handleAddSelectedAudios = () => {
    const allFilteredFiles = filteredAudioFiles;
    const files = allFilteredFiles.filter(f => selectedAudioRowKeys.includes(f.id));
    if (files.length > 0) openAddModal(files);
  };

  const handleCheckAndSavePlaylist = async () => {
    if (!selectedPlaylistId) {
      message.error('Bạn cần chọn chương trình phát!');
      return;
    }
    const arrFile = playlistItems.map(item => ({
      name: item.displayName,
      type: getGroupName(item.audioGroupId) === 'Nhạc' ? 'Music' : getGroupName(item.audioGroupId),
      frequency: item.frequency ?? 1,
      time_slot: item.timeSlot || '',
      duration: item.duration,
    }));

    const res = await fetch('/api/generate-playlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: arrFile }),
    });
    if (!res.ok) {
      message.error('Lỗi xử lý playlist!');
      return;
    }
    const { playlist: playlistObj } = await res.json();

    // Gửi 1 request duy nhất với mảng items
    const items = Object.values(playlistObj).map((d: any) => ({
      name: d.name,
      type: d.type,
      frequency: d.frequency,
      timeSlot: d.time_slot || '',
      duration: d.duration,
    }));
    const saveRes = await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        broadcastProgramId: selectedPlaylistId,
        items,
      }),
    });
    if (!saveRes.ok) {
      message.error('Lỗi lưu playlist!');
      return;
    }
    message.success('Lưu playlist thành công!');
  };

  return (
    <DashboardLayout>
      {/* Inject custom styles */}
      <style>{playlistManagementStyles}</style>

      <Card className="custom-card">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
          <CardTitle>Quản lý danh sách phát</CardTitle>
          <Button onClick={() => setShowModal(true)} className="w-full sm:w-auto">
            <PlusOutlined className="mr-2 h-4 w-4" />
            Tạo playlist mới
          </Button>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            {/* Playlist Selection */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                <Text className="font-medium self-center">Chọn playlist:</Text>
                <Select
                  className="w-full sm:w-40 min-w-[350px]"
                  placeholder="Chọn playlist"
                  value={selectedPlaylistId}
                  onChange={setSelectedPlaylistId}
                  options={playlists.map((p: any) => ({ value: p.id, label: p.name }))}
                  loading={loading}
                />
              </div>
            </div>

            {selectedPlaylistId && (
              <div className="bg-muted p-4 rounded-lg space-y-2 mb-6">
                <Text className="font-medium block">Thông tin playlist</Text>
                <div className="space-y-1">
                  <p><span className="font-medium">Tên:</span> {currentPlaylist?.name}</p>
                  <p>
                    <span className="font-medium">Ngày phát:</span>{' '}
                    {(currentPlaylist?.dates || [])
                      .map((d: any) => {
                        if (typeof d === 'string') return dayjs(d).format('DD/MM/YYYY');
                        if (d instanceof Date) return dayjs(d).format('DD/MM/YYYY');
                        if (d && typeof d === 'object' && typeof d.toDate === 'function') {
                          const dateObj = d.toDate();
                          if (dateObj instanceof Date) return dayjs(dateObj).format('DD/MM/YYYY');
                        }
                        return '';
                      })
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  <p><span className="font-medium">Số file audio:</span> {currentPlaylist?.audios?.length || 0}</p>
                </div>
              </div>
            )}

            {/* Current Playlist Table */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
                <Text className="font-medium">Danh sách phát hiện tại</Text>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                  <Button
                    variant={selectedPlaylistRowKeys.length === playlistItems.length && playlistItems.length > 0 ? "default" : "outline"}
                    onClick={handleSelectAllPlaylist}
                    className="w-full sm:w-auto"
                  >
                    <span className="mr-2">☑️</span>
                    Chọn tất cả
                  </Button>
                  <Button
                    variant={selectedPlaylistRowKeys.length === 0 ? "outline" : "default"}
                    onClick={handleDeselectAllPlaylist}
                    className="w-full sm:w-auto"
                  >
                    <span className="mr-2">☐</span>
                    Bỏ chọn
                  </Button>
                  <span className="text-sm text-muted-foreground self-center">
                    Đã chọn: {selectedPlaylistRowKeys.length}
                  </span>
                  {selectedPlaylistRowKeys.length > 0 ? (
                    <Button variant="destructive" onClick={handleDeleteSelectedPlaylistItems} className="w-full sm:w-auto">
                      Xóa {selectedPlaylistRowKeys.length} file đã chọn
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={handleAutoGeneratePlaylist} className="w-full sm:w-auto">
                        <PlusOutlined className="mr-2 h-4 w-4" />
                        Tạo tự động
                      </Button>
                      <Button onClick={handleCheckAndSavePlaylist} className="w-full sm:w-auto">
                        Kiểm tra & Lưu playlist
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="playlist-table">
                <Table
                  rowSelection={playlistRowSelection}
                  dataSource={playlistItems}
                  columns={[
                    { title: 'STT', dataIndex: 'stt', key: 'stt', render: (_: any, __: any, idx: number) => (playlistPage - 1) * playlistPageSize + idx + 1, align: 'center', width: 60 },
                    { title: 'Tên file', dataIndex: 'displayName', key: 'displayName', width: 180 },
                    { title: 'Nhóm', dataIndex: 'audioGroupId', key: 'audioGroupId', render: (id: number) => renderGroupBadge(id), width: 120 },
                    { title: 'Tần suất', dataIndex: 'frequency', key: 'frequency', render: (val: number, record: any) => val ?? 1, align: 'center', width: 90 },
                    { title: 'Duration', dataIndex: 'duration', key: 'duration', render: (val: number) => formatDuration(val), align: 'center', width: 90 },
                    { title: 'Khung giờ', dataIndex: 'timeSlot', key: 'timeSlot', render: (val: string) => val || '', align: 'center', width: 120 },
                    {
                      title: 'Thao tác',
                      key: 'actions',
                      align: 'center',
                      width: 120,
                      render: (_: any, record: any, idx: number) => {
                        const realIndex = (playlistPage - 1) * playlistPageSize + idx;
                        return (
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeletePlaylistItem(record.id)}
                            >
                              Xóa
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPlaylistItem(record, realIndex)}
                            >
                              Sửa
                            </Button>
                          </div>
                        );
                      },
                    },
                  ]}
                  rowKey="id"
                  pagination={{
                    current: playlistPage,
                    pageSize: playlistPageSize,
                    total: playlistTotal,
                    showSizeChanger: true,
                    onChange: (page, pageSize) => {
                      setPlaylistPage(page);
                      setPlaylistPageSize(pageSize);
                    },
                    showTotal: (total) => `Tổng ${total} file`,
                  }}
                  scroll={{ x: 700 }}
                  locale={{ emptyText: 'Chưa có file audio nào trong playlist' }}
                />
              </div>

              {selectedPlaylistRowKeys.length > 1 && (
                <div className="flex justify-end mt-4">
                  <Button onClick={handleEditMulti} className="w-full sm:w-auto">
                    Sửa tất cả
                  </Button>
                </div>
              )}
            </div>

            {/* Available Audio Files */}
            <div className="space-y-4 mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
                <Text className="font-medium">File audio có sẵn</Text>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                  <Button
                    variant={selectedAudioRowKeys.length === filteredAudioFiles.length && filteredAudioFiles.length > 0 ? "default" : "outline"}
                    onClick={handleSelectAll}
                    className="w-full sm:w-auto"
                  >
                    <span className="mr-2">☑️</span>
                    Chọn tất cả
                  </Button>
                  <Button
                    variant={selectedAudioRowKeys.length === 0 ? "outline" : "default"}
                    onClick={handleDeselectAll}
                    className="w-full sm:w-auto"
                  >
                    <span className="mr-2">☐</span>
                    Bỏ chọn
                  </Button>
                  <Button
                    variant="default"
                    disabled={selectedAudioRowKeys.length === 0}
                    onClick={handleAddSelectedAudios}
                    className="w-full sm:w-auto"
                  >
                    Thêm tất cả đã chọn
                  </Button>
                  <Input
                    placeholder="Tìm kiếm tên file nhạc..."
                    value={audioSearch}
                    onChange={e => setAudioSearch(e.target.value)}
                    className="w-full sm:w-64"
                  />
                  <Select
                    mode="multiple"
                    allowClear
                    placeholder="Lọc theo nhóm"
                    className="w-full sm:w-40 min-w-[180px]"
                    value={audioGroupFilter}
                    onChange={setAudioGroupFilter}
                    options={audioGroups.map((g: any) => ({ value: g.id, label: getGroupName(g.id) }))}
                  />
                  <span className="text-sm text-muted-foreground self-center">
                    Đã chọn: {selectedAudioRowKeys.length}
                  </span>
                </div>
              </div>

              <div className="playlist-table">
                <Table
                  rowSelection={audioRowSelection}
                  dataSource={pagedAudioFiles}
                  columns={[
                    { title: 'TÊN FILE', dataIndex: 'displayName', key: 'displayName', width: 180 },
                    { title: 'NHÓM', dataIndex: 'audioGroupId', key: 'audioGroupId', render: (id: number) => renderGroupBadge(id), width: 120 },
                    { title: 'THỜI LƯỢNG', dataIndex: 'duration', key: 'duration', align: 'center', render: (val: number) => formatDuration(val), width: 90 },
                    {
                      title: 'Thao tác',
                      key: 'actions',
                      align: 'center',
                      render: (_: any, record: any) => (
                        <Button
                          size="sm"
                          onClick={() => handleAddAudioToPlaylist(record)}
                        >
                          Thêm
                        </Button>
                      ),
                      width: 80,
                    },
                  ]}
                  rowKey="id"
                  pagination={{
                    current: audioPage,
                    pageSize: audioPageSize,
                    total: filteredAudioFiles.length,
                    showSizeChanger: true,
                    onChange: (page, pageSize) => {
                      setAudioPage(page);
                      setAudioPageSize(pageSize);
                    },
                    showTotal: (total) => `Tổng ${total} file`,
                  }}
                  scroll={{ x: 500 }}
                  locale={{ emptyText: 'Không có file audio nào' }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Playlist Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Tạo playlist mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Text className="font-medium">Tên playlist</Text>
              <Input
                value={playlistName}
                onChange={e => setPlaylistName(e.target.value)}
                placeholder="Nhập tên playlist"
              />
            </div>
            <div className="space-y-2">
              <Text className="font-medium">Chọn nhiều ngày phát sóng</Text>
              <MultiDatePicker
                value={selectedDates as any}
                onChange={value => {
                  if (Array.isArray(value)) setSelectedDates(value);
                  else if (value) setSelectedDates([value]);
                  else setSelectedDates([]);
                }}
                format="YYYY-MM-DD"
                className="w-full"
                placeholder="Chọn nhiều ngày"
              />
            </div>
          </div>
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreatePlaylist} disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Lưu'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Audio Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>
              {editMode === 'edit-single'
                ? 'Sửa file trong danh sách phát'
                : editMode === 'edit-multi'
                ? 'Sửa nhiều file trong danh sách phát'
                : addModalFiles.length > 1
                ? 'Thêm nhiều file vào danh sách phát'
                : 'Thêm file vào danh sách phát'}
            </DialogTitle>
          </DialogHeader>
          {(editMode === 'edit-multi' || (editMode === 'add' && addModalFiles.length > 1)) && (
            <div className="text-yellow-500 mb-4">
              <b>Chú ý:</b> Thao tác này sẽ cập nhật cho tất cả các file đã được chọn
            </div>
          )}
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <Text className="font-medium">Tần suất:</Text>
              <InputNumber
                min={1}
                value={addFrequency}
                onChange={v => setAddFrequency(v === null ? undefined : v)}
                placeholder="Tần suất"
                className="w-[120px]"
              />
            </div>
            <div className="flex items-center gap-4">
              <Text className="font-medium">Khung giờ:</Text>
              <Input
                value={addTimeSlot}
                onChange={e => setAddTimeSlot(e.target.value)}
                placeholder="Khung giờ"
                className="w-[200px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setEditMode('add');
                setEditIndexes([]);
              }}
            >
              Hủy
            </Button>
            <Button onClick={handleAddModalOk}>
              Lưu
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default PlaylistManagement;