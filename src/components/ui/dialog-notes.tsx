"use client";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, type Variants, motion } from "framer-motion";
import { X } from "lucide-react";

interface DialogNotesProps {
  isOpen: boolean;
  onClose: () => void;
}

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    transition: { delay: 0.3, duration: 0.3 },
  },
};

const modalVariants: Variants = {
  hidden: {
    scale: 0.8,
    opacity: 0,
    rotateX: 60,
    y: 100,
  },
  visible: {
    scale: 1,
    opacity: 1,
    rotateX: 0,
    y: 0,
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 300,
      delay: 0.2,
      duration: 0.6,
    },
  },
  exit: {
    scale: 0.8,
    opacity: 0,
    y: -100,
    transition: { duration: 0.3 },
  },
};

const headerVariants: Variants = {
  hidden: { x: -50, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      delay: 0.6,
      type: "spring",
      stiffness: 200,
    },
  },
};

const contentVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.8,
    },
  },
};

const itemVariants: Variants = {
  hidden: { x: -20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100 },
  },
};

const buttonsVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      delay: 1.2,
      type: "spring",
      stiffness: 200,
    },
  },
};

export function DialogNotes({ isOpen, onClose }: DialogNotesProps) {
  const { language } = useLanguage();

  return (
    <DialogPrimitive.Root
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open={isOpen}
    >
      <AnimatePresence>
        {isOpen ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                animate="visible"
                className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
                exit="exit"
                initial="hidden"
                variants={backdropVariants}
              />
            </DialogPrimitive.Overlay>

            <DialogPrimitive.Content asChild forceMount>
              <div className="perspective-1000 pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-2 focus:outline-none sm:p-4">
                <motion.div
                  animate="visible"
                  className="pointer-events-auto flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-xl"
                  exit="exit"
                  initial="hidden"
                  style={{ transformStyle: "preserve-3d" }}
                  variants={modalVariants}
                >
                  <motion.div
                    className="flex items-center justify-between border-b bg-gradient-to-r from-blue-600 to-blue-800 p-4 text-white"
                    variants={headerVariants}
                  >
                    <DialogPrimitive.Title className="text-xl font-bold">
                      {language === "fr"
                        ? "Notes d’utilisation"
                        : "Usage Notes"}
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Close asChild>
                      <button
                        aria-label={language === "fr" ? "Fermer" : "Close"}
                        className="text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        type="button"
                      >
                        <X aria-hidden="true" className="h-5 w-5" />
                      </button>
                    </DialogPrimitive.Close>
                  </motion.div>

                  <motion.div
                    className="flex-grow overflow-y-auto p-4 sm:p-6"
                    variants={contentVariants}
                  >
                    <motion.div
                      animate={{
                        scale: [1, 1.03, 1],
                        boxShadow: [
                          "0px 0px 0px rgba(66, 153, 225, 0.0)",
                          "0px 0px 20px rgba(66, 153, 225, 0.5)",
                          "0px 0px 0px rgba(66, 153, 225, 0.0)",
                        ],
                        transition: {
                          duration: 2,
                          repeat: Number.POSITIVE_INFINITY,
                          repeatType: "loop",
                        },
                      }}
                      className="mb-6 rounded-lg bg-blue-50 p-4"
                      variants={itemVariants}
                    >
                      <h3 className="mb-2 font-bold text-blue-800">
                        {language === "fr"
                          ? "CARTES VIRTUELLES"
                          : "VIRTUAL CARDS"}
                      </h3>
                      <DialogPrimitive.Description className="text-sm text-blue-700">
                        {language === "fr"
                          ? "Nous émettons des cartes virtuelles Mastercard et Visa (USD) qui fonctionnent sur toutes les plateformes à l’exception des plateformes de paris sportifs, de crypto monnaie, Wise et des films pour adulte."
                          : "We issue Mastercard and Visa virtual cards (USD) that work on all platforms except sports betting platforms, cryptocurrency, Wise, and adult content sites."}
                      </DialogPrimitive.Description>
                    </motion.div>

                    <motion.div
                      className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6"
                      variants={itemVariants}
                    >
                      <motion.div
                        variants={itemVariants}
                        whileHover={{
                          scale: 1.05,
                          transition: { duration: 0.2 },
                        }}
                      >
                        <h4 className="mb-1 text-sm text-gray-500">
                          {language === "fr"
                            ? "Période de validité"
                            : "Validity Period"}
                        </h4>
                        <p className="font-medium">
                          {language === "fr" ? "3 ans" : "3 years"}
                        </p>
                      </motion.div>
                      <motion.div
                        variants={itemVariants}
                        whileHover={{
                          scale: 1.05,
                          transition: { duration: 0.2 },
                        }}
                      >
                        <h4 className="mb-1 text-sm text-gray-500">
                          {language === "fr"
                            ? "Limite par transaction"
                            : "Transaction Limit"}
                        </h4>
                        <p className="font-medium">10 000 $</p>
                      </motion.div>
                      <motion.div
                        variants={itemVariants}
                        whileHover={{
                          scale: 1.05,
                          transition: { duration: 0.2 },
                        }}
                      >
                        <h4 className="mb-1 text-sm text-gray-500">
                          {language === "fr"
                            ? "Limite du solde"
                            : "Balance Limit"}
                        </h4>
                        <p className="font-medium">100 000 $</p>
                      </motion.div>
                      <motion.div
                        variants={itemVariants}
                        whileHover={{
                          scale: 1.05,
                          transition: { duration: 0.2 },
                        }}
                      >
                        <h4 className="mb-1 text-sm text-gray-500">
                          {language === "fr" ? "Frais d’échec" : "Failure Fee"}
                        </h4>
                        <p className="font-medium">
                          {language === "fr"
                            ? "0.3 $ par transaction"
                            : "$0.3 per transaction"}
                        </p>
                      </motion.div>
                    </motion.div>

                    <motion.div
                      className="mb-6 space-y-3"
                      variants={itemVariants}
                    >
                      <motion.div
                        className="flex items-start space-x-2 text-red-600"
                        variants={itemVariants}
                        whileHover={{
                          x: 5,
                          transition: { duration: 0.2 },
                        }}
                      >
                        <X className="mt-0.5 h-5 w-5 flex-shrink-0" />
                        <p className="text-sm">
                          {language === "fr"
                            ? "Les cartes sont résiliées après 3 à 5 refus successifs"
                            : "Cards are terminated after 3 to 5 consecutive rejections"}
                        </p>
                      </motion.div>
                      <motion.div
                        className="flex items-start space-x-2 text-red-600"
                        variants={itemVariants}
                        whileHover={{
                          x: 5,
                          transition: { duration: 0.2 },
                        }}
                      >
                        <X className="mt-0.5 h-5 w-5 flex-shrink-0" />
                        <p className="text-sm">
                          {language === "fr"
                            ? "Les cartes sont résiliées si elles ne sont pas rechargées 3 semaines après leur achat"
                            : "Cards are terminated if they are not recharged 3 weeks after purchase"}
                        </p>
                      </motion.div>
                    </motion.div>
                  </motion.div>

                  <motion.div
                    className="sticky bottom-0 flex flex-col space-y-2 border-t bg-white p-3 sm:flex-row sm:space-x-4 sm:space-y-0 sm:p-4"
                    variants={buttonsVariants}
                  >
                    <motion.div
                      className="flex-1"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Button
                        className="w-full bg-blue-600 text-white hover:bg-blue-700"
                        disabled
                      >
                        {language === "fr"
                          ? "Procéder au paiement"
                          : "Proceed to payment"}
                      </Button>
                    </motion.div>
                    <motion.div
                      className="flex-1"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Button className="w-full" disabled variant="outline">
                        {language === "fr"
                          ? "Paiement direct"
                          : "Direct payment"}
                      </Button>
                    </motion.div>
                  </motion.div>
                </motion.div>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
