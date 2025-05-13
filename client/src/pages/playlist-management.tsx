import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Table, Button, Modal, Select, Typography, Space, Row, Col, message, Badge } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Input } from '@/components/ui/input';
import MultiDatePicker, { DateObject } from 'react-multi-date-picker';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

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

  // Fetch audio files from API
  useEffect(() => {
    fetch('/api/audio-files')
      .then(res => res.json())
      .then(data => {
        if (data.audioFiles) setAudioFiles(data.audioFiles);
        else if (Array.isArray(data)) setAudioFiles(data);
      });
  }, []);

  // Fetch playlists from API
  const fetchPlaylists = () => {
    setLoading(true);
    fetch('/api/broadcast-programs')
      .then(res => res.json())
      .then(data => {
        setPlaylists(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };
  useEffect(fetchPlaylists, []);

  // Fetch audio groups
  useEffect(() => {
    fetch('/api/audio-groups')
      .then(res => res.json())
      .then(data => setAudioGroups(data || []));
  }, []);

  // Modal create playlist
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

  // Lấy playlist hiện tại
  const currentPlaylist = playlists.find((p: any) => p.id === selectedPlaylistId);

  // Khi chọn playlist, load audios nếu có
  useEffect(() => {
    if (currentPlaylist && currentPlaylist.audios) {
      setPlaylistItems(currentPlaylist.audios);
    } else {
      setPlaylistItems([]);
    }
  }, [currentPlaylist]);

  // Hàm thêm audio vào playlist
  const handleAddAudioToPlaylist = (audio: any) => {
    if (!playlistItems.some((item: any) => item.id === audio.id)) {
      setPlaylistItems([...playlistItems, { ...audio, time: `00:00` }]);
    }
  };

  // Hàm tạo tự động playlist (ví dụ: lấy tất cả audio có sẵn)
  const handleAutoGeneratePlaylist = () => {
    setPlaylistItems(audioFiles.map((audio: any, idx: number) => ({ ...audio, time: `00:${(idx*2).toString().padStart(2,'0')}` })));
  };

  // Hàm format thời lượng
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Hàm lấy tên nhóm từ id
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

  // Hàm lấy màu badge từ tên nhóm
  const getGroupColor = (name: string) => {
    if (name === 'Lời chào') return 'blue';
    if (name === 'Khuyến mãi') return 'orange';
    if (name === 'Mẹo vặt') return 'green';
    if (name === 'Thông báo') return 'red';
    if (name === 'Nhạc') return 'purple';
    return 'gray';
  };

  const renderGroupBadge = (audioGroupId: number) => {
    const name = getGroupName(audioGroupId);
    const color = getGroupColor(name);
    return <Badge color={color} text={name} />;
  };

  // Hàm lấy tần suất từ audioGroups
  const getFrequency = (audioGroupId: number) => {
    const group = audioGroups.find((g: any) => g.id === audioGroupId);
    return group ? group.frequency : '';
  };

  // Lọc audioFiles theo search và nhóm
  const filteredAudioFiles = audioFiles.filter(file => {
    const matchName = file.displayName.toLowerCase().includes(audioSearch.toLowerCase());
    const matchGroup = audioGroupFilter.length === 0 || audioGroupFilter.includes(file.audioGroupId);
    return matchName && matchGroup;
  });

  // Tùy chỉnh rowSelection để không highlight row
  const audioRowSelection = {
    selectedRowKeys: selectedAudioRowKeys,
    onChange: setSelectedAudioRowKeys,
    columnTitle: <span>Chọn</span>,
    renderCell: (checked: boolean, record: any, index: number, originNode: React.ReactNode) => originNode,
    preserveSelectedRowKeys: true,
    hideSelectAll: false,
    getCheckboxProps: () => ({ style: { accentColor: '#1677ff' } }),
  };
  const playlistRowSelection = {
    selectedRowKeys: selectedPlaylistRowKeys,
    onChange: setSelectedPlaylistRowKeys,
    columnTitle: <span>Chọn</span>,
    renderCell: (checked: boolean, record: any, index: number, originNode: React.ReactNode) => originNode,
    preserveSelectedRowKeys: true,
    hideSelectAll: false,
    getCheckboxProps: () => ({ style: { accentColor: '#1677ff' } }),
  };

  // Hàm chọn tất cả và bỏ chọn cho audio có sẵn
  const handleSelectAllAudio = () => setSelectedAudioRowKeys(filteredAudioFiles.map(f => f.id));
  const handleDeselectAllAudio = () => setSelectedAudioRowKeys([]);

  return (
    <DashboardLayout>
      <div style={{ background: '#fff', minHeight: '100vh', width: '100%' }}>
        <Row gutter={24} style={{ width: '100%' }}>
          <Col xs={24} md={16} style={{ width: '100%' }}>
            <Space direction="vertical" size={24} style={{ width: '100%' }}>
              <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #f0f1f2', padding: 32 }}>
                <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                  <Col>
                    <Title level={4} style={{ margin: 0 }}>Quản lý danh sách phát</Title>
                  </Col>
                  <Col>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
                      Tạo playlist mới
                    </Button>
                  </Col>
                </Row>
                {/* Modal tạo playlist */}
                <Modal
                  title="Tạo playlist mới"
                  open={showModal}
                  onCancel={() => setShowModal(false)}
                  onOk={handleCreatePlaylist}
                  okText="Lưu"
                  confirmLoading={loading}
                  centered
                >
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>Tên playlist</Text>
                    <Input value={playlistName} onChange={e => setPlaylistName(e.target.value)} placeholder="Nhập tên playlist" style={{ marginTop: 4, marginBottom: 16 }} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>Chọn nhiều ngày phát sóng</Text>
                    <div style={{ marginTop: 8, marginBottom: 8 }}>
                      <MultiDatePicker
                        value={selectedDates as any}
                        onChange={value => {
                          if (Array.isArray(value)) setSelectedDates(value);
                          else if (value) setSelectedDates([value]);
                          else setSelectedDates([]);
                        }}
                        format="YYYY-MM-DD"
                        style={{ width: '100%' }}
                        placeholder="Chọn nhiều ngày"
                      />
                    </div>
                  </div>
                </Modal>
                {/* Dropdown chọn playlist */}
                <div style={{ marginBottom: 20 }}>
                  <Text strong>Chọn playlist</Text>
                  <Select
                    style={{ width: 350, marginLeft: 16 }}
                    placeholder="Chọn playlist"
                    value={selectedPlaylistId}
                    onChange={setSelectedPlaylistId}
                    options={playlists.map((p: any) => ({ value: p.id, label: p.name }))}
                    loading={loading}
                  />
                </div>
                {/* Thông tin playlist */}
                <div style={{ marginBottom: 20 }}>
                  <Title level={5} style={{ marginBottom: 8 }}>Thông tin playlist</Title>
                  {selectedPlaylistId ? (
                    <div style={{ lineHeight: 2 }}>
                      <Text><b>Tên:</b> {currentPlaylist?.name}</Text><br />
                      <Text><b>Ngày phát:</b> {(currentPlaylist?.dates || [])
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
                        .join(', ')
                      }</Text><br />
                      <Text><b>Số file audio:</b> {currentPlaylist?.audios?.length || 0}</Text>
                    </div>
                  ) : <Text type="secondary"><i>Chưa chọn playlist</i></Text>}
                </div>
                {/* Danh sách phát hiện tại */}
                <div style={{ marginBottom: 20 }}>
                  <Title level={5} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Danh sách phát hiện tại</span>
                    <Button onClick={handleAutoGeneratePlaylist} icon={<PlusOutlined />}>Tạo tự động</Button>
                  </Title>
                  <Table
                    rowSelection={playlistRowSelection}
                    dataSource={playlistItems}
                    columns={[
                      { title: 'STT', dataIndex: 'stt', key: 'stt', render: (_: any, __: any, idx: number) => idx + 1, align: 'center', width: 60 },
                      { title: 'Tên file', dataIndex: 'displayName', key: 'displayName', width: 180 },
                      { title: 'Nhóm', dataIndex: 'audioGroupId', key: 'audioGroupId', render: (id: number) => renderGroupBadge(id), width: 120 },
                      { title: 'Tần suất', dataIndex: 'audioGroupId', key: 'frequency', render: (id: number) => getFrequency(id), align: 'center', width: 90 },
                      { title: 'Duration', dataIndex: 'duration', key: 'duration', render: (val: number) => formatDuration(val), align: 'center', width: 90 },
                      { title: 'Khung giờ', dataIndex: 'timeSlot', key: 'timeSlot', render: (val: string) => val || '', align: 'center', width: 120 },
                      { title: 'Thao tác', key: 'actions', align: 'center', render: (_: any, record: any) => <Button danger>Xóa</Button>, width: 80 },
                    ]}
                    rowKey="id"
                    pagination={false}
                    style={{ background: '#fff', borderRadius: 8, minWidth: 700 }}
                    scroll={{ x: 700 }}
                    locale={{ emptyText: 'Chưa có file audio nào trong playlist' }}
                    rowClassName={() => ''}
                  />
                  {selectedPlaylistRowKeys.length > 1 && (
                    <div style={{ textAlign: 'right', marginTop: 12 }}>
                      <Button type="primary">Sửa tất cả</Button>
                    </div>
                  )}
                </div>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={12} style={{ width: '100%', maxWidth: '50%', minWidth: 350 }}>
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #f0f1f2', padding: 24, overflowX: 'auto' }}>
              <Title level={5} style={{ margin: 0, marginBottom: 16 }}>File audio có sẵn</Title>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                <Button
                  type={selectedAudioRowKeys.length === filteredAudioFiles.length && filteredAudioFiles.length > 0 ? 'primary' : 'default'}
                  onClick={handleSelectAllAudio}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <span style={{ fontSize: 18, marginRight: 4 }}>☑️</span> Chọn tất cả
                </Button>
                <Button
                  type={selectedAudioRowKeys.length === 0 ? 'default' : 'primary'}
                  onClick={handleDeselectAllAudio}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <span style={{ fontSize: 18, marginRight: 4 }}>☐</span> Bỏ chọn
                </Button>
                <Input
                  placeholder="Tìm kiếm tên file nhạc..."
                  value={audioSearch}
                  onChange={e => setAudioSearch(e.target.value)}
                  style={{ width: 220, marginLeft: 16 }}
                />
                <Select
                  mode="multiple"
                  allowClear
                  placeholder="Lọc theo nhóm"
                  style={{ minWidth: 180 }}
                  value={audioGroupFilter}
                  onChange={setAudioGroupFilter}
                  options={audioGroups.map((g: any) => ({ value: g.id, label: getGroupName(g.id) }))}
                />
                <span style={{ marginLeft: 'auto', fontWeight: 500 }}>
                  Đã chọn: {selectedAudioRowKeys.length}
                </span>
              </div>
              <Table
                rowSelection={audioRowSelection}
                dataSource={filteredAudioFiles}
                columns={[
                  { title: 'TÊN FILE', dataIndex: 'displayName', key: 'displayName', width: 180 },
                  { title: 'NHÓM', dataIndex: 'audioGroupId', key: 'audioGroupId', render: (id: number) => renderGroupBadge(id), width: 120 },
                  { title: 'THỜI LƯỢNG', dataIndex: 'duration', key: 'duration', align: 'center', render: (val: number) => formatDuration(val), width: 90 },
                  { title: 'Thao tác', key: 'actions', align: 'center', render: (_: any, record: any) => <Button type="primary" onClick={() => handleAddAudioToPlaylist(record)}>Thêm</Button>, width: 80 },
                ]}
                rowKey="id"
                pagination={false}
                style={{ background: '#fff', borderRadius: 8, minWidth: 500 }}
                scroll={{ x: 500 }}
                locale={{ emptyText: 'Không có file audio nào' }}
                rowClassName={() => ''}
              />
            </div>
          </Col>
        </Row>
      </div>
    </DashboardLayout>
  );
};

export default PlaylistManagement; 