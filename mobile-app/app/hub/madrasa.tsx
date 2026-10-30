import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { useResponsiveLayout } from '../../lib/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MADRASA_STORAGE_KEY = '@deen_madrasa_attendance_v1';

export interface Student {
  id: string;
  name: string;
  mobileNo: string;
  enrolledOn: string;
}

export interface AttendanceRecord {
  date: string; // YYYY-MM-DD
  presentStudentIds: string[];
}

interface MadrasaData {
  students: Student[];
  records: AttendanceRecord[];
}

export default function MadrasaScreen() {
  const { colors, isDark } = useTheme();
  const { contentContainerStyle } = useResponsiveLayout();
  const [data, setData] = useState<MadrasaData>({ students: [], records: [] });
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Add Student Modal States
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentMobile, setStudentMobile] = useState('');

  useEffect(() => {
    loadMadrasaData();
  }, []);

  const loadMadrasaData = async () => {
    try {
      const raw = await AsyncStorage.getItem(MADRASA_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const dummyIds = new Set(['std-1', 'std-2', 'std-3', 'std-4']);
        const cleanedStudents = (parsed.students || []).filter(
          (s: Student) => !dummyIds.has(s.id)
        );
        const cleanedData = {
          students: cleanedStudents,
          records: parsed.records || [],
        };
        setData(cleanedData);
        await AsyncStorage.setItem(MADRASA_STORAGE_KEY, JSON.stringify(cleanedData));
      } else {
        const initialData: MadrasaData = {
          students: [],
          records: [],
        };
        setData(initialData);
        await AsyncStorage.setItem(MADRASA_STORAGE_KEY, JSON.stringify(initialData));
      }
    } catch (err) {
      console.warn('Error loading madrasa data:', err);
    }
  };

  const persistData = async (updated: MadrasaData) => {
    setData(updated);
    try {
      await AsyncStorage.setItem(MADRASA_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Error saving madrasa data:', err);
    }
  };

  const currentRecord = data.records.find((r) => r.date === selectedDate) || {
    date: selectedDate,
    presentStudentIds: [],
  };

  const toggleStudentAttendance = async (studentId: string) => {
    const isPresent = currentRecord.presentStudentIds.includes(studentId);
    const updatedPresent = isPresent
      ? currentRecord.presentStudentIds.filter((id) => id !== studentId)
      : [...currentRecord.presentStudentIds, studentId];

    const updatedRecords = data.records.some((r) => r.date === selectedDate)
      ? data.records.map((r) =>
          r.date === selectedDate ? { ...r, presentStudentIds: updatedPresent } : r
        )
      : [...data.records, { date: selectedDate, presentStudentIds: updatedPresent }];

    await persistData({
      ...data,
      records: updatedRecords,
    });
  };

  const handleMarkAll = async (present: boolean) => {
    const updatedPresent = present ? data.students.map((s) => s.id) : [];
    const updatedRecords = data.records.some((r) => r.date === selectedDate)
      ? data.records.map((r) =>
          r.date === selectedDate ? { ...r, presentStudentIds: updatedPresent } : r
        )
      : [...data.records, { date: selectedDate, presentStudentIds: updatedPresent }];

    await persistData({
      ...data,
      records: updatedRecords,
    });
  };

  const handleAddStudent = async () => {
    if (!studentName.trim()) {
      Alert.alert('Required', 'Please enter student name.');
      return;
    }

    const newStudent: Student = {
      id: `std-${Date.now()}`,
      name: studentName.trim(),
      mobileNo: studentMobile.trim(),
      enrolledOn: new Date().toISOString().split('T')[0],
    };

    const updated: MadrasaData = {
      ...data,
      students: [...data.students, newStudent],
    };

    await persistData(updated);
    setStudentName('');
    setStudentMobile('');
    setIsAddModalVisible(false);
  };

  const handleDeleteStudent = (id: string, name: string) => {
    Alert.alert('Remove Student', `Are you sure you want to remove ${name} from the maktab roster?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated: MadrasaData = {
            students: data.students.filter((s) => s.id !== id),
            records: data.records.map((r) => ({
              ...r,
              presentStudentIds: r.presentStudentIds.filter((pId) => pId !== id),
            })),
          };
          await persistData(updated);
        },
      },
    ]);
  };

  const presentCount = currentRecord.presentStudentIds.length;
  const absentCount = data.students.length - presentCount;
  const attendanceRate = data.students.length > 0 ? Math.round((presentCount / data.students.length) * 100) : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Overview Stat Board */}
      <View style={[styles.statBoard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>TOTAL STUDENTS</Text>
          <Text style={[styles.totalValue, { color: colors.text }]}>{data.students.length}</Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.borderSubtle }]} />

        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>PRESENT (حاضر)</Text>
          <Text style={[styles.presentValue, { color: colors.accentGreen }]}>{presentCount}</Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.borderSubtle }]} />

        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>ABSENT (غائب)</Text>
          <Text style={styles.absentValue}>{absentCount}</Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.borderSubtle }]} />

        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>RATE</Text>
          <Text style={[styles.rateValue, { color: colors.accentGold }]}>{attendanceRate}%</Text>
        </View>
      </View>

      {/* Date & Bulk Actions Row */}
      <View style={styles.controlsRow}>
        <View style={[styles.dateBadge, { backgroundColor: colors.pill, borderColor: colors.borderSubtle }]}>
          <Feather name="calendar" size={12} color={colors.accentGold} style={{ marginRight: 5 }} />
          <Text style={[styles.dateBadgeText, { color: colors.accentGold }]}>Date: {
selectedDate}</Text>
        </View>

        <View style={styles.bulkBtnGroup}>
          <TouchableOpacity
            style={[styles.bulkBtn, { backgroundColor: colors.pill, borderColor: colors.borderSubtle }]}
            onPress={() => handleMarkAll(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.bulkBtnText, { color: colors.text }]}>All Present</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bulkBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
            onPress={() => handleMarkAll(false)}
            activeOpacity={0.8}
          >
            <Text style={[styles.bulkBtnText, { color: '#ef4444' }]}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addStudentBtn, { backgroundColor: colors.accentGold }]}
            onPress={() => setIsAddModalVisible(true)}
            activeOpacity={0.8}
          >
            <Feather name="user-plus" size={12} color="#0f1718" style={{ marginRight: 4 }} />
            <Text style={[styles.addStudentBtnText, { color: '#0f1718' }]}>Add Student</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Students List */}
      <FlatList
        data={data.students}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, contentContainerStyle]}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Feather name="users" size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No students enrolled yet.</Text>
            <TouchableOpacity
              style={[styles.emptyAddBtn, { backgroundColor: colors.accentGold }]}
              onPress={() => setIsAddModalVisible(true)}
            >
              <Text style={[styles.emptyAddBtnText, { color: '#0f1718' }]}>+ Add First Student</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item, index }) => {
          const isPresent = currentRecord.presentStudentIds.includes(item.id);

          return (
            <View style={[styles.studentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.studentIndexCircle, { backgroundColor: colors.pill }]}>
                <Text style={[styles.studentIndexText, { color: colors.accentGold }]}>{index + 1}</Text>
              </View>

              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={[styles.studentName, { color: colors.text }]}>{item.name}</Text>
                {item.mobileNo ? (
                  <Text style={[styles.studentMobile, { color: colors.textMuted }]}>Parent: {
item.mobileNo}</Text>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={() => handleDeleteStudent(item.id, item.name)}
                style={styles.removeBtn}
              >
                <Feather name="trash-2" size={13} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Present / Absent Toggle Button */}
              <TouchableOpacity
                style={[
                  styles.attendanceStatusBtn,
                  isPresent
                    ? { backgroundColor: isDark ? 'rgba(0, 255, 102, 0.15)' : 'rgba(5, 150, 105, 0.15)', borderColor: colors.accentGreen }
                    : styles.absentBtnActive,
                ]}
                onPress={() => toggleStudentAttendance(item.id)}
                activeOpacity={0.8}
              >
                <Feather
                  name={isPresent ? 'check' : 'x'}
                  size={12}
                  color={isPresent ? colors.accentGreen : '#ef4444'}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.attendanceStatusText,
                    isPresent ? { color: colors.accentGreen } : styles.absentText,
                  ]}
                >
                  {isPresent ? 'Present' : 'Absent'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* Add Student Modal */}
      <Modal visible={isAddModalVisible} animationType="slide" transparent onRequestClose={() => setIsAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Enroll Madrasa / Maktab Student</Text>
              <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                <Feather name="x" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Student Full Name *</Text>
            <TextInput
              style={[styles.inputField, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle, color: colors.text }]}
              placeholder="e.g. Mohammed Hamza"
              placeholderTextColor={colors.textMuted}
              value={studentName}
              onChangeText={setStudentName}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Parent Mobile Number (For Attendance Alerts)</Text>
            <TextInput
              style={[styles.inputField, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle, color: colors.text }]}
              placeholder="+91 98480 12345"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={studentMobile}
              onChangeText={setStudentMobile}
            />

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: colors.accentGold }]}
              onPress={handleAddStudent}
              activeOpacity={0.8}
            >
              <Text style={[styles.modalSubmitBtnText, { color: '#0f1718' }]}>Enroll to Maktab Roster</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {

    flex: 1,
    backgroundColor: '#0f1718',
  },
  statBoard: {

    flexDirection: 'row',
    backgroundColor: '#0b2527',
    margin: 16,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#0b383b',
    alignItems: 'center',
  },
  statCol: {

    flex: 1,
    alignItems: 'center',
  },
  statDivider: {

    width: 1,
    height: 32,
    backgroundColor: '#1b4a4d',
  },
  statLabel: {

    fontSize: 8,
    fontWeight: '700',
    color: '#94a4a2',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  totalValue: {

    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  presentValue: {

    fontSize: 15,
    fontWeight: '800',
    color: '#00ff66',
  },
  absentValue: {

    fontSize: 15,
    fontWeight: '800',
    color: '#ef4444',
  },
  rateValue: {

    fontSize: 15,
    fontWeight: '800',
    color: '#e2a23b',
  },
  controlsRow: {

    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  dateBadge: {

    flexDirection: 'row',
    backgroundColor: '#0c3033',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  dateBadgeText: {

    fontSize: 11,
    fontWeight: '700',
    color: '#ffdda8',
    textAlign: "center",
    includeFontPadding: false,
  },
  bulkBtnGroup: {

    flexDirection: 'row',
    gap: 6,
  },
  bulkBtn: {

    backgroundColor: 'rgba(0, 255, 102, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  bulkBtnText: {

    fontSize: 10,
    fontWeight: '700',
    color: '#00ff66',
  },
  addStudentBtn: {

    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e2a23b',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  addStudentBtnText: {

    fontSize: 10,
    fontWeight: '700',
    color: '#0f1718',
  },
  listContent: {

    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 8,
  },
  studentCard: {

    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b2527',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  studentIndexCircle: {

    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#0c3033',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentIndexText: {

    fontSize: 10,
    fontWeight: '700',
    color: '#94a4a2',
  },
  studentName: {

    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  studentMobile: {

    fontSize: 10,
    color: '#94a4a2',
    marginTop: 2,
  },
  removeBtn: {

    padding: 6,
    marginRight: 6,
  },
  attendanceStatusBtn: {

    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  presentBtnActive: {

    backgroundColor: 'rgba(0, 255, 102, 0.12)',
    borderColor: '#00ff66',
  },
  absentBtnActive: {

    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: '#ef4444',
  },
  attendanceStatusText: {

    fontSize: 11,
    fontWeight: '700',
  },
  presentText: {

    color: '#00ff66',
  },
  absentText: {

    color: '#ef4444',
  },
  emptyBox: {

    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {

    color: '#64748b',
    fontSize: 12,
  },
  emptyAddBtn: {

    marginTop: 10,
    backgroundColor: '#e2a23b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyAddBtnText: {

    color: '#0f1718',
    fontWeight: '700',
    fontSize: 12,
  },
  modalOverlay: {

    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {

    backgroundColor: '#0b2527',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.3)',
  },
  modalHeader: {

    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 8,
  },
  modalTitle: {

    fontSize: 13,
    fontWeight: '700',
    color: '#ffdda8',
  },
  inputLabel: {

    fontSize: 11,
    fontWeight: '600',
    color: '#94a4a2',
    marginBottom: 4,
    marginTop: 8,
  },
  inputField: {

    backgroundColor: '#0c3033',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalSubmitBtn: {

    backgroundColor: '#e2a23b',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  modalSubmitBtnText: {

    color: '#0f1718',
    fontSize: 13,
    fontWeight: '700',
  },
});
