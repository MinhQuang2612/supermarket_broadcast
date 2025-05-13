// Playlist algorithm for backend Node.js

export class TimeHelper {
  static timeToSeconds(time) {
    const [hours, minutes, seconds] = time.split(':');
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
  }

  static secondsToTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

export class PlaylistManager {
  constructor() {
    this.playlist = {};
    this.TOTAL_DURATION = 54000; // 15 hours in seconds
    this.arrTimeSlot = [];
    this.arrNormal = [];
    this.arrMusic = [];
    this.totalTime = 0;
  }

  processInputData(allItems) {
    const arrFileMusic = allItems.filter(item => item.type === 'Music');
    const arrFile = allItems.filter(item => item.type !== 'Music');
    let totalTime = 0;
    for (const item of arrFile) {
      if (item.time_slot && item.time_slot !== '') {
        this.arrTimeSlot.push(item);
      } else {
        this.arrNormal.push(item);
      }
      totalTime += parseInt(item.duration) * parseInt(item.frequency);
    }
    this.arrTimeSlot.sort((a, b) => a.time_slot.localeCompare(b.time_slot));
    this.totalTime = totalTime;
    const rate = Math.round(totalTime / (this.TOTAL_DURATION - totalTime));
    this.processMusic(arrFileMusic);
    this.processNormalItems();
    this.insertMusicItems(rate);
    this.processTimeSlots();
    return rate;
  }

  processMusic(arrFileMusic) {
    let totalTime = this.totalTime;
    while (totalTime < this.TOTAL_DURATION) {
      for (const item of arrFileMusic) {
        totalTime += parseInt(item.duration);
        if (totalTime > this.TOTAL_DURATION) break;
        this.arrMusic.push({
          name: item.name,
          type: 'Music',
          duration: parseInt(item.duration)
        });
      }
    }
  }

  processNormalItems() {
    this.arrNormal.sort((a, b) => parseInt(b.frequency) - parseInt(a.frequency));
    const arrTemp = [];
    for (const item of this.arrNormal) {
      for (let i = 0; i < parseInt(item.frequency); i++) {
        const t = { ...item };
        t.frequency = 1;
        t.duration = parseInt(t.duration);
        arrTemp.push(t);
      }
    }
    const frequency = 30;
    let i = 0;
    const arr = [[]];
    for (const item of arrTemp) {
      if (!arr[i]) arr[i] = [];
      arr[i].push(item);
      if (arr[i].length === frequency) i++;
    }
    let run = false;
    while (arr[0] && arr[0].length > 0) {
      for (let k = 0; k < arr.length; k++) {
        if (!arr[k] || !arr[k].length) continue;
        const it = arr[k].shift();
        if (!it) continue;
        if (run === false) {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const end = new Date(start.getTime() + it.duration * 1000);
          const key = `${this.formatTimeForKey(start)}-${this.formatTimeForKey(end)}`;
          this.playlist[key] = it;
          run = true;
        } else {
          const keys = Object.keys(this.playlist);
          const last = keys[keys.length - 1];
          const [_, endTime] = last.split('-');
          const start = new Date();
          start.setHours(
            parseInt(endTime.split(':')[0]),
            parseInt(endTime.split(':')[1]),
            parseInt(endTime.split(':')[2])
          );
          const end = new Date(start.getTime() + it.duration * 1000);
          const key = `${this.formatTimeForKey(start)}-${this.formatTimeForKey(end)}`;
          this.playlist[key] = it;
        }
      }
    }
  }

  formatTimeForKey(date) {
    return date.toTimeString().split(' ')[0];
  }

  processTimeSlots() {
    for (const item of this.arrTimeSlot) {
      const time = item.time_slot.split('-');
      const startParts = time[0].split(':');
      const endParts = time[1].split(':');
      const start = new Date();
      start.setHours(parseInt(startParts[0]), parseInt(startParts[1]), 0);
      const end = new Date();
      end.setHours(parseInt(endParts[0]), parseInt(endParts[1]), 0);
      const rangeDuration = (end.getTime() - start.getTime()) / 1000;
      const timeLength = rangeDuration / parseInt(item.frequency);
      for (let i = 0; i < parseInt(item.frequency); i++) {
        const s = start.getTime() / 1000 + (timeLength * i);
        let pos = 0;
        for (const k of Object.keys(this.playlist)) {
          const itemStart = new Date();
          const startTimeParts = k.split('-')[0].split(':');
          itemStart.setHours(
            parseInt(startTimeParts[0]),
            parseInt(startTimeParts[1]),
            parseInt(startTimeParts[2])
          );
          if (itemStart.getTime() / 1000 > s) {
            this.insertAndUpdateKeys(item, pos);
            break;
          }
          pos++;
        }
      }
    }
  }

  insertAndUpdateKeys(newItem, insertPosition) {
    const intervals = this.convertToIntervals();
    if (!intervals[insertPosition]) return;
    const newStart = intervals[insertPosition].end;
    const newEnd = newStart + parseInt(newItem.duration);
    const newInterval = {
      start: newStart,
      end: newEnd,
      data: { ...newItem, duration: parseInt(newItem.duration) }
    };
    intervals.splice(insertPosition + 1, 0, newInterval);
    this.updatePlaylistFromIntervals(intervals, insertPosition);
  }

  convertToIntervals() {
    const intervals = [];
    for (const [timeRange, data] of Object.entries(this.playlist)) {
      const [start, end] = timeRange.split('-');
      intervals.push({
        start: TimeHelper.timeToSeconds(start),
        end: TimeHelper.timeToSeconds(end),
        data: data
      });
    }
    return intervals;
  }

  updatePlaylistFromIntervals(intervals, insertPosition) {
    const arrTmp = {};
    const arrKeys = Object.keys(this.playlist);
    for (let i = 0; i <= insertPosition && i < arrKeys.length; i++) {
      arrTmp[arrKeys[i]] = this.playlist[arrKeys[i]];
    }
    this.playlist = arrTmp;
    for (let i = insertPosition + 1; i < intervals.length; i++) {
      if (i > insertPosition + 1) {
        intervals[i].start = intervals[i - 1].end;
        intervals[i].end = intervals[i].start + intervals[i].data.duration;
      }
      const key = `${TimeHelper.secondsToTime(intervals[i].start)}-${TimeHelper.secondsToTime(intervals[i].end)}`;
      this.playlist[key] = intervals[i].data;
    }
    this.playlist = Object.fromEntries(
      Object.entries(this.playlist).sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    );
  }

  insertMusicItems(rate) {
    let j = rate - 1;
    let i = 0;
    for (const newItem of this.arrMusic) {
      const playlistValues = Object.values(this.playlist);
      if (!playlistValues[j]) {
        i++;
        j = rate - 1 + i;
        if (j >= playlistValues.length) break;
      }
      this.insertAndUpdateKeys(newItem, j);
      j += (rate + 1) + i;
    }
  }

  getPlaylist() {
    return this.playlist;
  }
} 