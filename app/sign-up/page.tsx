import { SignUpForm } from '@/components/sign-up';

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50/20 to-gray-100/20 dark:from-gray-900/20 dark:to-gray-950/20 backdrop-blur-3xl flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Digital Lessons
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create interactive AI-powered lessons
          </p>
        </div>
        <SignUpForm />
      </div>
    </main>
  );
}
