"use client";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { LampContainer } from "@/components/ui/lamp";
import { ArrowRight, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <LampContainer>
      <motion.div
        initial={{ opacity: 0.5, y: 100 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.3,
          duration: 0.8,
          ease: "easeInOut",
        }}
        className="mt-8 flex flex-col items-center space-y-8"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{
            delay: 0.5,
            duration: 0.6,
            ease: "easeInOut",
          }}
          className="mb-4"
        >
          <Image
            src="https://cdn.prod.website-files.com/67b6f7ecc0b5b185628fc902/67b6fa305fe70f88ef38db30_logo.svg"
            alt="Logo"
            width={120}
            height={40}
            className="filter brightness-0 invert"
          />
        </motion.div>

        {/* Main Title */}
        <h1 className="bg-gradient-to-br from-slate-300 to-slate-500 py-4 bg-clip-text text-center text-4xl font-bold tracking-tight text-transparent md:text-7xl">
          Starter Kit
        </h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.7,
            duration: 0.6,
            ease: "easeInOut",
          }}
          className="text-slate-400 text-center text-lg md:text-xl max-w-2xl leading-relaxed"
        >
          Modern, beautiful, and powerful starter kit built with Next.js, TypeScript, and Tailwind CSS. 
          Ready to accelerate your development journey.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.9,
            duration: 0.6,
            ease: "easeInOut",
          }}
          className="flex flex-col sm:flex-row gap-4 mt-8"
        >
                     {/* Primary Button */}
           <Link 
             href="/dashboard"
             className="group relative inline-flex h-12 overflow-hidden rounded-lg p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50"
           >
             <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2E8F0_0%,#1E293B_50%,#E2E8F0_100%)]" />
             <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-lg bg-slate-950 px-8 py-1 text-sm font-medium text-white backdrop-blur-3xl group-hover:bg-slate-900 transition-colors">
               <Sparkles className="mr-2 h-4 w-4" />
               Dashboard
               <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
             </span>
           </Link>

           {/* Secondary Button */}
           <Link
             href="/project-status"
             className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-600 bg-transparent px-8 py-1 text-sm font-medium text-slate-300 backdrop-blur-3xl hover:bg-slate-800/50 hover:text-white transition-all duration-200"
           >
             Project Status
           </Link>
        </motion.div>

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{
            delay: 1.1,
            duration: 0.6,
            ease: "easeInOut",
          }}
          className="flex flex-wrap justify-center gap-6 mt-12 text-sm text-slate-500"
        >
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
            <span>Next.js 15</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
            <span>TypeScript</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
            <span>Tailwind CSS</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
            <span>Framer Motion</span>
    </div>
        </motion.div>
      </motion.div>
    </LampContainer>
  );
}
