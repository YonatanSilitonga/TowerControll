import Swal from "sweetalert2";

export const swal = {
  success: (title: string, text?: string) =>
    Swal.fire({
      icon: "success",
      title,
      text,
      timer: 3000,
      showConfirmButton: false,
      timerProgressBar: true,
    }),

  error: (title: string, text?: string) =>
    Swal.fire({
      icon: "error",
      title,
      text,
    }),

  info: (title: string, text?: string) =>
    Swal.fire({
      icon: "info",
      title,
      text,
      timer: 3000,
      showConfirmButton: false,
      timerProgressBar: true,
    }),

  confirm: async (
    title: string,
    text: string,
    confirmText = "Ya",
  ): Promise<boolean> => {
    const result = await Swal.fire({
      title,
      text,
      icon: "warning",
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: confirmText,
      cancelButtonText: "Batal",
    });
    return result.isConfirmed;
  },

  confirmDelete: async (
    text = "Data tidak dapat dikembalikan!",
  ): Promise<boolean> => {
    return swal.confirm("Apakah Anda yakin?", text, "Ya, hapus!");
  },

  confirmQuestion: async (
    title: string,
    text: string,
    confirmText = "Ya",
  ): Promise<boolean> => {
    const result = await Swal.fire({
      title,
      text,
      icon: "question",
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: confirmText,
      cancelButtonText: "Batal",
    });
    return result.isConfirmed;
  },
};
