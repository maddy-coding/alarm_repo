import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const alarmBackend = {
  create(currentAlarms, values) {
    const nextAlarm = normalizeAlarm({
      ...values,
      enabled: true,
      id: `alarm-${Date.now()}`,
    });

    return [...currentAlarms, nextAlarm];
  },
  delete(currentAlarms, alarmId) {
    return currentAlarms.filter((alarm) => alarm.id !== alarmId);
  },
  toggle(currentAlarms, alarmId) {
    return currentAlarms.map((alarm) =>
      alarm.id === alarmId ? { ...alarm, enabled: !alarm.enabled } : alarm,
    );
  },
};

function normalizeAlarm(alarm) {
  const hourNumber = Number.parseInt(alarm.hour, 10);
  const minuteNumber = Number.parseInt(alarm.minute, 10);

  return {
    ...alarm,
    hour: Number.isFinite(hourNumber) ? String(Math.min(Math.max(hourNumber, 1), 12)) : '7',
    minute: Number.isFinite(minuteNumber)
      ? String(Math.min(Math.max(minuteNumber, 0), 59)).padStart(2, '0')
      : '00',
    period: alarm.period === 'PM' ? 'PM' : 'AM',
    title: alarm.title?.trim() || 'Alarm',
  };
}

function formatClock(date) {
  let hour = date.getHours();
  const minute = String(date.getMinutes()).padStart(2, '0');
  const period = hour >= 12 ? 'pm' : 'am';

  hour %= 12;

  return `${String(hour || 12).padStart(2, '0')}:${minute} ${period}`;
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatTileDate(date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function buildUpcomingDays(startDate) {
  const firstDay = new Date(startDate);
  firstDay.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(firstDay);
    date.setDate(firstDay.getDate() + index);

    return {
      date: formatTileDate(date),
      id: formatDateKey(date),
      isToday: index === 0,
      name: WEEKDAYS[date.getDay()],
    };
  });
}

export default function App() {
  const days = useMemo(() => buildUpcomingDays(new Date()), []);
  const [alarms, setAlarms] = useState(() => [
    {
      id: 'alarm-1',
      dayId: days[0].id,
      enabled: true,
      hour: '8',
      minute: '00',
      period: 'AM',
      title: 'Meeting at Great hall',
    },
  ]);
  const [currentTime, setCurrentTime] = useState(() => formatClock(new Date()));
  const [draftDayId, setDraftDayId] = useState(days[0].id);
  const [draftHour, setDraftHour] = useState('7');
  const [draftMinute, setDraftMinute] = useState('00');
  const [draftPeriod, setDraftPeriod] = useState('AM');
  const [draftTitle, setDraftTitle] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(formatClock(new Date())), 1000);

    return () => clearInterval(timer);
  }, []);

  const alarmsByDay = useMemo(
    () =>
      alarms.reduce((groups, alarm) => {
        groups[alarm.dayId] = [...(groups[alarm.dayId] || []), alarm];
        return groups;
      }, {}),
    [alarms],
  );

  const openAlarmForm = (dayId = days[0].id) => {
    setDraftDayId(dayId);
    setDraftHour('7');
    setDraftMinute('00');
    setDraftPeriod('AM');
    setDraftTitle('');
    setModalVisible(true);
  };

  const createAlarm = () => {
    setAlarms((currentAlarms) =>
      alarmBackend.create(currentAlarms, {
        dayId: draftDayId,
        hour: draftHour,
        minute: draftMinute,
        period: draftPeriod,
        title: draftTitle,
      }),
    );
    setModalVisible(false);
  };

  const deleteAlarm = (alarmId) => {
    setAlarms((currentAlarms) => alarmBackend.delete(currentAlarms, alarmId));
  };

  const toggleAlarm = (alarmId) => {
    setAlarms((currentAlarms) => alarmBackend.toggle(currentAlarms, alarmId));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>Time</Text>
            <Text style={styles.heroTime}>{currentTime}</Text>
          </View>

          <View style={styles.daysList}>
            {days.map((day) => (
              <DayTile
                alarms={alarmsByDay[day.id] || []}
                day={day}
                key={day.id}
                onAdd={() => openAlarmForm(day.id)}
                onDelete={deleteAlarm}
                onToggle={toggleAlarm}
              />
            ))}
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <Pressable
            accessibilityRole="button"
            onPress={() => openAlarmForm()}
            style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          >
            <Text style={styles.addButtonText}>New Add Alarm</Text>
          </Pressable>
        </View>
      </View>

      <AlarmModal
        dayId={draftDayId}
        days={days}
        hour={draftHour}
        minute={draftMinute}
        onChangeDay={setDraftDayId}
        onChangeHour={setDraftHour}
        onChangeMinute={setDraftMinute}
        onChangePeriod={setDraftPeriod}
        onChangeTitle={setDraftTitle}
        onClose={() => setModalVisible(false)}
        onCreate={createAlarm}
        period={draftPeriod}
        title={draftTitle}
        visible={modalVisible}
      />
    </SafeAreaView>
  );
}

function DayTile({ alarms, day, onAdd, onDelete, onToggle }) {
  return (
    <View style={[styles.dayTile, alarms.length > 0 && styles.dayTileWithAlarms]}>
      <View style={styles.dayHeader}>
        <View style={styles.dayInfo}>
          {day.isToday ? <Text style={styles.todayLabel}>Today</Text> : null}
          <Text style={styles.dayName}>{day.name}</Text>
          
        </View>
        <Text style={styles.dayDate}>{day.date}</Text>
        <Pressable accessibilityRole="button" onPress={onAdd} style={styles.plusButton}>
          <Text style={styles.plusButtonText}>+</Text>
        </Pressable>
      </View>

      {alarms.length > 0 ? (
        <View style={styles.alarmStack}>
          {alarms.map((alarm) => (
            <AlarmRow
              alarm={alarm}
              key={alarm.id}
              onDelete={() => onDelete(alarm.id)}
              onToggle={() => onToggle(alarm.id)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function AlarmRow({ alarm, onDelete, onToggle }) {
  const slideX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 8 && Math.abs(gesture.dy) < 12,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx < 0) {
          slideX.setValue(Math.max(gesture.dx, -104));
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -124) {
          onDelete();
          return;
        }

        Animated.spring(slideX, {
          bounciness: 6,
          toValue: gesture.dx < -56 ? -84 : 0,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  return (
    <View style={styles.alarmSlideFrame}>
      <View style={styles.deleteReveal}>
        <Pressable accessibilityRole="button" onPress={onDelete} style={styles.deleteRevealButton}>
          <Text style={styles.deleteRevealText}>Delete</Text>
        </Pressable>
      </View>

      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.alarmRow, { transform: [{ translateX: slideX }] }]}
      >
        <View style={styles.alarmCopy}>
          <Text style={[styles.alarmTime, !alarm.enabled && styles.alarmDisabled]}>
            {alarm.hour}:{alarm.minute} {alarm.period}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.alarmTitle, !alarm.enabled && styles.alarmDisabled]}
          >
            {alarm.title}
          </Text>
        </View>

        <Switch
          ios_backgroundColor="#e8ded1"
          onValueChange={onToggle}
          thumbColor="#ffffff"
          trackColor={{ false: '#e8ded1', true: '#cb6847' }}
          value={alarm.enabled}
        />
      </Animated.View>
    </View>
  );
}

function AlarmModal({
  dayId,
  days,
  hour,
  minute,
  onChangeDay,
  onChangeHour,
  onChangeMinute,
  onChangePeriod,
  onChangeTitle,
  onClose,
  onCreate,
  period,
  title,
  visible,
}) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalShade}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Alarm</Text>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>x</Text>
            </Pressable>
          </View>

          <View style={styles.timeInputs}>
            <TextInput
              keyboardType="number-pad"
              maxLength={2}
              onChangeText={onChangeHour}
              placeholder="07"
              placeholderTextColor="#a19286"
              style={styles.timeInput}
              value={hour}
            />
            <Text style={styles.timeColon}>:</Text>
            <TextInput
              keyboardType="number-pad"
              maxLength={2}
              onChangeText={onChangeMinute}
              placeholder="00"
              placeholderTextColor="#a19286"
              style={styles.timeInput}
              value={minute}
            />
            <View style={styles.periodGroup}>
              {['AM', 'PM'].map((item) => (
                <Pressable
                  accessibilityRole="button"
                  key={item}
                  onPress={() => onChangePeriod(item)}
                  style={[styles.periodButton, period === item && styles.periodButtonActive]}
                >
                  <Text
                    style={[styles.periodButtonText, period === item && styles.periodButtonTextActive]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <TextInput
            onChangeText={onChangeTitle}
            placeholder="Alarm title"
            placeholderTextColor="#a19286"
            style={styles.titleInput}
            value={title}
          />

          <ScrollView
            contentContainerStyle={styles.dayPicker}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {days.map((day) => (
              <Pressable
                accessibilityRole="button"
                key={day.id}
                onPress={() => onChangeDay(day.id)}
                style={[styles.dayChip, dayId === day.id && styles.dayChipActive]}
              >
                <Text style={[styles.dayChipText, dayId === day.id && styles.dayChipTextActive]}>
                  {day.name.slice(0, 3)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable accessibilityRole="button" onPress={onCreate} style={styles.createButton}>
            <Text style={styles.createButtonText}>Create Alarm</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5eee7',
  },
  screen: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    maxWidth: 520,
    paddingBottom: 120,
    paddingHorizontal: 22,
    width: '100%',
  },
  hero: {
    alignItems: 'center',
    minHeight: 260,
    justifyContent: 'center',
    paddingTop: 40,
  },
  heroLabel: {
    color: '#030303',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  heroTime: {
    color: '#030303',
    fontSize: 38,
    fontWeight: '900',
  },
  daysList: {
    gap: 8,
  },
  dayTile: {
    backgroundColor: '#ffffff',
    borderColor: '#e5d8ca',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 76,
    overflow: 'hidden',
  },
  dayTileWithAlarms: {
    minHeight: 152,
  },
  dayHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    minHeight: 76,
    paddingHorizontal: 16,
  },
  dayInfo: {
    flex: 1,
    minWidth: 0,
  },
  dayName: {
    color: '#323234',
    fontSize: 20,
    fontWeight: '900',
  },
  todayLabel: {
    color: '#9b8b7f',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 3,
    textTransform: 'uppercase',
  },
  dayDate: {
    color: '#c96848',
    fontSize: 16,
    fontWeight: '900',
    minWidth: 122,
    textAlign: 'center',
  },
  plusButton: {
    alignItems: 'center',
    borderColor: '#c96848',
    borderRadius: 8,
    borderWidth: 2,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  plusButtonText: {
    color: '#c96848',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 16,
  },
  alarmStack: {
    borderTopColor: '#f1e7dd',
    borderTopWidth: 1,
    marginHorizontal: 18,
    paddingBottom: 8,
    paddingTop: 10,
  },
  alarmSlideFrame: {
    marginBottom: 10,
    minHeight: 54,
    overflow: 'hidden',
  },
  deleteReveal: {
    alignItems: 'flex-end',
    borderRadius: 8,
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    paddingRight: 10,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  deleteRevealButton: {
    alignItems: 'center',
    backgroundColor: '#ff5c5c',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    width: 74,
  },
  deleteRevealText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  alarmRow: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    gap: 12,
    minHeight: 54,
    paddingLeft: 2,
  },
  alarmCopy: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  alarmTime: {
    color: '#303033',
    fontSize: 16,
    fontWeight: '900',
    minWidth: 60,
  },
  alarmTitle: {
    color: '#c96848',
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'left',
  },
  alarmDisabled: {
    opacity: 0.48,
  },
  bottomBar: {
    alignSelf: 'center',
    bottom: 0,
    maxWidth: 520,
    paddingBottom: 24,
    paddingHorizontal: 22,
    paddingTop: 12,
    position: 'absolute',
    width: '100%',
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e5d8ca',
    borderRadius: 999,
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 62,
  },
  addButtonPressed: {
    transform: [{ scale: 0.99 }],
  },
  addButtonText: {
    color: '#303033',
    fontSize: 18,
    fontWeight: '700',
  },
  modalShade: {
    backgroundColor: 'rgba(25, 20, 16, 0.28)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fffaf5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    color: '#2f2f31',
    fontSize: 22,
    fontWeight: '800',
  },
  closeButton: {
    alignItems: 'center',
    borderColor: '#e5d8ca',
    borderRadius: 8,
    borderWidth: 2,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  closeButtonText: {
    color: '#9c5a42',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 22,
  },
  timeInputs: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  timeInput: {
    backgroundColor: '#ffffff',
    borderColor: '#e5d8ca',
    borderRadius: 12,
    borderWidth: 1,
    color: '#2f2f31',
    fontSize: 26,
    fontWeight: '900',
    height: 58,
    textAlign: 'center',
    width: 72,
  },
  timeColon: {
    color: '#2f2f31',
    fontSize: 26,
    fontWeight: '800',
  },
  periodGroup: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 2,
  },
  periodButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e5d8ca',
    borderRadius: 8,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 48,
  },
  periodButtonActive: {
    backgroundColor: '#c96848',
    borderColor: '#c96848',
  },
  periodButtonText: {
    color: '#8f7d6f',
    fontSize: 14,
    fontWeight: '900',
  },
  periodButtonTextActive: {
    color: '#ffffff',
  },
  titleInput: {
    backgroundColor: '#ffffff',
    borderColor: '#e5d8ca',
    borderRadius: 8,
    borderWidth: 1,
    color: '#2f2f31',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 14,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  dayPicker: {
    gap: 6,
    paddingVertical: 16,
  },
  dayChip: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e5d8ca',
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 54,
  },
  dayChipActive: {
    backgroundColor: '#2f2f31',
    borderColor: '#2f2f31',
  },
  dayChipText: {
    color: '#8f7d6f',
    fontSize: 13,
    fontWeight: '900',
  },
  dayChipTextActive: {
    color: '#ffffff',
  },
  createButton: {
    alignItems: 'center',
    backgroundColor: '#c96848',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 52,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
