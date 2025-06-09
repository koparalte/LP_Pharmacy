import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/dashboard');
  return null; // redirect() throws an error, so this is unreachable but good practice
}
