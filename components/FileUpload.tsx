import React, { useCallback } from 'react';
import Papa from 'papaparse';
import { Upload, FileType } from 'lucide-react';
import { CsvRow } from '../types';

interface FileUploadProps {
    onDataParsed: (data: CsvRow[], fileName: string) => void;
    onError: (message: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataParsed, onError }) => {
    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
            onError("กรุณาอัปโหลดไฟล์ CSV เท่านั้น (Please upload a CSV file)");
            return;
        }

        Papa.parse<CsvRow>(file, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    console.error("CSV Parse Errors:", results.errors);
                    onError(`เกิดข้อผิดพลาดในการอ่านไฟล์: ${results.errors[0].message}`);
                } else {
                    onDataParsed(results.data, file.name);
                }
            },
            error: (error) => {
                onError(`CSV Parsing failed: ${error.message}`);
            }
        });
    }, [onDataParsed, onError]);

    return (
        <div className="w-full p-8 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col items-center justify-center text-center cursor-pointer relative group">
            <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="bg-indigo-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">อัปโหลดไฟล์ CSV</h3>
            <p className="text-sm text-slate-500 mt-2">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                <FileType className="w-4 h-4" />
                <span>Supports .csv files (e.g., H_ZCSR181H_Cleaned_20250930.csv)</span>
            </div>
        </div>
    );
};

export default FileUpload;