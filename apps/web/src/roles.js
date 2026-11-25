// Role labels and the navigation each role gets. This is presentation only:
// the server decides what a person may actually read or change.
export const ROLES = {
  owner: {label: 'Master admin', short: 'Owner'},
  teacher: {label: 'Teacher', short: 'Teacher'},
  student: {label: 'Student', short: 'Student'}
};

export function navFor(caps) {
  if (!caps) return [];
  const role = caps.role;
  const items = [{to: '/chat', label: 'Ask a question', icon: 'chat'}];
  if (role === 'student') {
    items.push({to: '/home', label: 'My work', icon: 'home'});
    items.push({to: '/practice', label: 'Practice', icon: 'book'});
  }
  if (role === 'teacher') {
    items.push({to: '/teacher', label: 'My classes', icon: 'users'});
    items.push({to: '/content', label: 'Syllabus control', icon: 'sliders'});
  }
  if (role === 'owner') {
    items.push({to: '/owner', label: 'Schools', icon: 'building'});
    items.push({to: '/content', label: 'Content control', icon: 'sliders'});
  }
  items.push({to: '/about', label: 'About this site', icon: 'info'});
  return items;
}

export function scopeLabel(scope) {
  if (!scope) return '';
  return `Class ${scope.class} · ${String(scope.subject || '').replace(/^./, c => c.toUpperCase())}`;
}

export function subjectLabel(subject) {
  return String(subject || '').replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
}
