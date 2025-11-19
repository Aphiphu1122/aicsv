import React, { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileSpreadsheet, Search, Bot, AlertCircle, Loader2, RefreshCw, Trash2, Database, CheckCircle2 } from 'lucide-react';
import FileUpload from './components/FileUpload';
import { generateDataReport } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import { CsvRow, ProcessingStatus } from './types';

const App: React.FC = () => {
  const [csvData, setCsvData] = useState<CsvRow[] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [report, setReport] = useState<string>("");
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  
  // Database saving states
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const handleDataParsed = useCallback((data: CsvRow[], name: string) => {
    console.log(`File parsed: ${name}, Rows: ${data.length}`);
    setCsvData(data);
    setFileName(name);
    setStatus(ProcessingStatus.IDLE);
    setError(null);
    setReport("");
    setSaveStatus('idle');
  }, []);

  const handleFileUploadError = useCallback((msg: string) => {
    console.error("File upload error:", msg);
    setError(msg);
    setStatus(ProcessingStatus.ERROR);
  }, []);

  const handleReset = useCallback(() => {
    setCsvData(null);
    setFileName("");
    setQuery("");
    setReport("");
    setStatus(ProcessingStatus.IDLE);
    setError(null);
    setSaveStatus('idle');
  }, []);

  const saveToDatabase = async (currentQuery: string, result: string) => {
    if (!supabase) {
        console.warn("Supabase client not initialized. Skipping save.");
        return;
    }

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      console.log("Saving report to Supabase...");
      const { error } = await supabase.from('reports').insert({
        file_name: fileName,
        query: currentQuery,
        report_content: result
      });

      if (error) throw error;
      console.log("Saved to Supabase successfully.");
      setSaveStatus('saved');
    } catch (err) {
      console.error("Failed to save to Supabase:", err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvData || !query.trim()) return;

    console.log("Starting analysis...");
    setStatus(ProcessingStatus.ANALYZING);
    setError(null);
    setReport("");
    setSaveStatus('idle');

    try {
      const result = await generateDataReport(csvData, query);
      console.log("Analysis completed.");
      setReport(result);
      setStatus(ProcessingStatus.COMPLETED);
      
      // Auto-save to Supabase
      await saveToDatabase(query, result);

    } catch (err: any) {
      console.error("Analysis failed in App:", err);
      setError(err.message || "เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูล");
      setStatus(ProcessingStatus.ERROR);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              CSV Insight AI
            </h1>
          </div>
          <div className="text-sm text-gray-500 hidden sm:block">
            Powered by Gemini 2.5 Flash
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            วิเคราะห์ข้อมูล CSV ของคุณด้วย AI
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            อัปโหลดไฟล์ CSV (เช่น รายงานยอดขาย, ข้อมูลการเงิน) และพิมพ์คำถามภาษาไทยเพื่อให้ AI ช่วยสรุปและหา Insights ให้คุณทันที
          </p>
        </div>

        {/* Upload Section */}
        {!csvData && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 animate-in fade-in zoom-in duration-300">
            <FileUpload onDataParsed={handleDataParsed} onError={handleFileUploadError} />
            {error && status === ProcessingStatus.ERROR && (
               <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
                 <AlertCircle className="w-5 h-5 flex-shrink-0" />
                 <span>{error}</span>
               </div>
            )}
          </div>
        )}

        {/* Analysis Section */}
        {csvData && (
          <div className="grid gap-8 lg:grid-cols-3 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* Left Column: Controls */}
            <div className="lg:col-span-1 space-y-6">
              {/* File Info Card */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-700">ข้อมูลไฟล์</h3>
                  <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full">Loaded</span>
                </div>
                <div className="flex items-center gap-3 mb-4">
                    <FileSpreadsheet className="w-10 h-10 text-green-600" />
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium text-gray-900 truncate" title={fileName}>{fileName}</p>
                        <p className="text-xs text-gray-500">{csvData.length.toLocaleString()} แถว (Rows)</p>
                    </div>
                </div>
                <button 
                  onClick={handleReset}
                  className="w-full flex items-center justify-center gap-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 py-2 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  เปลี่ยนไฟล์ (Reset)
                </button>
              </div>

              {/* Query Form */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 sticky top-24">
                <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
                  สิ่งที่คุณต้องการรู้ (ภาษาไทย)
                </label>
                <form onSubmit={handleAnalyze}>
                  <textarea
                    id="query"
                    rows={4}
                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none mb-4"
                    placeholder="เช่น สรุปยอด Amount รวมต่อ BA, หรือ หา 5 อันดับแรกที่มีปัญหาสูงสุด"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={status === ProcessingStatus.ANALYZING}
                  />
                  <button
                    type="submit"
                    disabled={!query.trim() || status === ProcessingStatus.ANALYZING}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    {status === ProcessingStatus.ANALYZING ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        กำลังวิเคราะห์...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        วิเคราะห์ข้อมูล (Analyze)
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Report */}
            <div className="lg:col-span-2">
              <div className="bg-white min-h-[500px] rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 relative">
                {/* Status Bar for Database Save */}
                {status === ProcessingStatus.COMPLETED && (
                    <div className="absolute top-4 right-4 flex items-center gap-2 text-xs">
                        {isSaving && (
                            <span className="flex items-center gap-1 text-gray-500">
                                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                            </span>
                        )}
                        {!isSaving && saveStatus === 'saved' && (
                            <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                                <CheckCircle2 className="w-3 h-3" /> Saved to DB
                            </span>
                        )}
                        {!isSaving && saveStatus === 'error' && (
                             <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-100" title="Check console/environment variables">
                                <Database className="w-3 h-3" /> Save Failed
                            </span>
                        )}
                    </div>
                )}

                {status === ProcessingStatus.IDLE && !report && (
                   <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                      <Bot className="w-16 h-16 mb-4 opacity-20" />
                      <p>พิมพ์คำถามและกดวิเคราะห์เพื่อดูรายงาน</p>
                   </div>
                )}

                {status === ProcessingStatus.ERROR && error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex flex-col gap-2 text-red-700">
                        <div className="flex items-center gap-2 font-semibold">
                             <AlertCircle className="w-5 h-5" />
                             <span>เกิดข้อผิดพลาด</span>
                        </div>
                        <p className="text-sm">{error}</p>
                        <button 
                            onClick={() => handleAnalyze({ preventDefault: () => {} } as React.FormEvent)}
                            className="self-start mt-2 text-xs bg-white border border-red-300 px-3 py-1 rounded hover:bg-red-50"
                        >
                            ลองใหม่ (Retry)
                        </button>
                    </div>
                )}

                {report && (
                  <div className="prose prose-slate prose-indigo max-w-none">
                     {/* Markdown Render */}
                     <ReactMarkdown>{report}</ReactMarkdown>
                  </div>
                )}

                {status === ProcessingStatus.ANALYZING && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-xl">
                        <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                        <h3 className="text-lg font-semibold text-gray-800">Gemini กำลังทำงาน...</h3>
                        <p className="text-sm text-gray-500">กำลังอ่าน CSV และสร้างรายงานสรุป</p>
                        <p className="text-xs text-gray-400 mt-2">(อาจใช้เวลา 5-10 วินาที)</p>
                    </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;