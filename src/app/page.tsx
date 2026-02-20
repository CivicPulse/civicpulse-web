import Link from "next/link";

export default function Home() {
  return (
    <div className="text-center py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">CivicPulse</h1>
      <p className="text-lg text-gray-600 mb-8">
        Voter data management and geocoding platform
      </p>
      <div className="flex justify-center gap-4">
        <Link
          href="/voters"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          View Voters
        </Link>
        <Link
          href="/address-lookup"
          className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Address Lookup
        </Link>
      </div>
    </div>
  );
}
