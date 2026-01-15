export const extractBackendError = (error: any, defaultHeading: string) => {
  return {
    status: false,
    message: error?.response?.data?.message || "Something went wrong",
    heading: error?.response?.data?.heading || defaultHeading,
  };
};
